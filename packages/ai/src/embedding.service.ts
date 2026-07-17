import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@readhub/types"
import { ARTICLE_DOCUMENTS_BUCKET } from "@readhub/database"
import { withObservability } from "@readhub/shared/observability"

import { extractDocumentText } from "./document-extraction.service"
import { generateEmbeddings, toPgVectorLiteral } from "./providers/voyage"

const SERVICE = "embedding.service"

// Tamaño objetivo de un fragmento: lo bastante grande para tener sentido por
// sí solo, lo bastante pequeño para que la similitud no se diluya entre
// varios temas dentro del mismo fragmento.
const CHUNK_TARGET_CHARS = 1200

// Solape entre fragmentos consecutivos: sin él, una idea que cae justo en la
// frontera queda partida en dos y deja de ser recuperable desde ninguno de
// los dos lados.
const CHUNK_OVERLAP_CHARS = 150

interface ArticleRecord {
  id: string
  title: string
  summary: string | null
  document_path: string
}

async function fetchArticle(
  supabase: SupabaseClient<Database>,
  articleId: string
): Promise<ArticleRecord> {
  const { data, error } = await supabase
    .from("articles")
    .select("id, title, summary, document_path")
    .eq("id", articleId)
    .single()

  if (error) throw error
  return data
}

/**
 * null si el objeto no existe en Storage: se trata como resultado, no como
 * error de programación. Exportada porque indexing.service (Prompt 8)
 * también necesita descargar el documento antes de delegar en este service
 * para vectorizarlo, en vez de duplicar la llamada a Storage.
 */
export async function downloadDocumentBytes(
  supabase: SupabaseClient<Database>,
  documentPath: string
): Promise<ArrayBuffer | null> {
  const { data, error } = await supabase.storage.from(ARTICLE_DOCUMENTS_BUCKET).download(documentPath)
  if (error || !data) return null
  return data.arrayBuffer()
}

function splitIntoParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
}

/** Divide un texto por tamaño con solape constante entre piezas consecutivas. */
function splitBySize(text: string, targetChars: number, overlapChars: number): string[] {
  const pieces: string[] = []
  let start = 0

  while (start < text.length) {
    const end = Math.min(start + targetChars, text.length)
    pieces.push(text.slice(start, end))
    if (end >= text.length) break
    start = end - overlapChars
  }

  return pieces
}

/**
 * Fragmenta el texto respetando límites de párrafo cuando caben en el
 * tamaño objetivo; solo parte por tamaño los párrafos que lo excedan, con
 * el mismo solape. Al cerrar un fragmento por acumulación de párrafos, el
 * siguiente arranca con la cola del anterior (~CHUNK_OVERLAP_CHARS) para
 * que el solape también exista en esa frontera, no solo dentro de párrafos
 * partidos por tamaño.
 */
function chunkText(text: string): string[] {
  const paragraphs = splitIntoParagraphs(text)
  const chunks: string[] = []
  let current = ""

  const flush = () => {
    const trimmed = current.trim()
    if (trimmed.length > 0) chunks.push(trimmed)
  }

  for (const paragraph of paragraphs) {
    if (paragraph.length > CHUNK_TARGET_CHARS) {
      flush()
      chunks.push(...splitBySize(paragraph, CHUNK_TARGET_CHARS, CHUNK_OVERLAP_CHARS))
      current = ""
      continue
    }

    const candidate = current.length > 0 ? `${current}\n\n${paragraph}` : paragraph
    if (candidate.length > CHUNK_TARGET_CHARS) {
      flush()
      const tail = current.slice(-CHUNK_OVERLAP_CHARS)
      current = tail.length > 0 ? `${tail}\n\n${paragraph}` : paragraph
    } else {
      current = candidate
    }
  }
  flush()

  return chunks
}

/**
 * Título (y resumen, si existe) que se antepone a CADA fragmento antes de
 * vectorizarlo. Un fragmento tomado del centro de un documento pierde el
 * tema del que habla; anclarlo con esta cabecera hace que una consulta
 * sobre el tema general del artículo también recupere fragmentos internos
 * que nunca mencionan esa palabra.
 */
function buildChunkHeader(article: { title: string; summary: string | null }): string {
  return article.summary ? `${article.title}\n${article.summary}` : article.title
}

/** Solo para el texto que se envía a vectorizar: el fragmento se almacena desnudo, sin esta cabecera. */
function buildEmbeddingInput(header: string, chunkContent: string): string {
  return `${header}\n\n${chunkContent}`
}

interface ChunkInsertRow {
  article_id: string
  chunk_index: number
  content: string
  embedding: string
}

/**
 * Idempotente por diseño: borra todos los fragmentos existentes del
 * artículo antes de insertar los nuevos, así que reindexar dos veces deja
 * el mismo estado en vez de acumular duplicados.
 */
async function persistChunks(
  supabase: SupabaseClient<Database>,
  articleId: string,
  contents: string[],
  vectors: number[][]
): Promise<void> {
  const { error: deleteError } = await supabase
    .from("article_chunks")
    .delete()
    .eq("article_id", articleId)
  if (deleteError) throw deleteError

  if (contents.length === 0) return

  const rows: ChunkInsertRow[] = contents.map((content, index) => ({
    article_id: articleId,
    chunk_index: index,
    content,
    embedding: toPgVectorLiteral(vectors[index]),
  }))

  const { error: insertError } = await supabase.from("article_chunks").insert(rows)
  if (insertError) throw insertError
}

// "no-document": Storage no tiene el objeto (o dejó de existir). "no-text":
// document-extraction.service ya colapsa "formato sin extractor" y "sin
// texto aprovechable" (p. ej. un PDF escaneado) en el mismo null — a este
// nivel no hay forma de distinguirlos, y separarlos artificialmente solo
// simularía una precisión que no existe.
export type EmbeddingSkipReason = "no-document" | "no-text"

export interface ArticleEmbeddingResult {
  articleId: string
  indexed: boolean
  chunksCreated: number
  reason?: EmbeddingSkipReason
}

export interface EmbeddableArticle {
  id: string
  title: string
  summary: string | null
}

/**
 * Fragmenta, vectoriza y persiste los embeddings de un artículo a partir de
 * texto YA extraído. Punto de delegación que usa indexing.service (Prompt 8)
 * tras obtener el documento y extraer su texto por su cuenta — este service
 * no vuelve a tocar Storage ni el extractor para ese caso. `text: null` no
 * es un error: es el resultado de un documento sin texto aprovechable.
 */
async function _generateEmbeddingsFromText(
  supabase: SupabaseClient<Database>,
  article: EmbeddableArticle,
  text: string | null
): Promise<ArticleEmbeddingResult> {
  if (!text) {
    await persistChunks(supabase, article.id, [], [])
    return { articleId: article.id, indexed: false, chunksCreated: 0, reason: "no-text" }
  }

  const chunks = chunkText(text)
  if (chunks.length === 0) {
    await persistChunks(supabase, article.id, [], [])
    return { articleId: article.id, indexed: false, chunksCreated: 0, reason: "no-text" }
  }

  const header = buildChunkHeader(article)
  const embeddingInputs = chunks.map((chunk) => buildEmbeddingInput(header, chunk))
  const vectors = await generateEmbeddings(embeddingInputs, "document")

  await persistChunks(supabase, article.id, chunks, vectors)

  return { articleId: article.id, indexed: true, chunksCreated: chunks.length }
}

export const generateEmbeddingsFromText = withObservability(
  SERVICE,
  "generateEmbeddingsFromText",
  _generateEmbeddingsFromText
)

/**
 * Pipeline completo a partir de solo un id: obtiene el artículo, descarga y
 * extrae su documento, y delega en generateEmbeddingsFromText. Para
 * llamadores que no tienen ya el artículo resuelto (MCP, tests); el Route
 * Handler de indexación (Prompt 8) sí lo tiene y usa indexing.service en su
 * lugar para no repetir esa consulta.
 */
async function _generateArticleEmbeddings(
  supabase: SupabaseClient<Database>,
  articleId: string
): Promise<ArticleEmbeddingResult> {
  const article = await fetchArticle(supabase, articleId)

  const bytes = await downloadDocumentBytes(supabase, article.document_path)
  if (!bytes) {
    await persistChunks(supabase, articleId, [], [])
    return { articleId, indexed: false, chunksCreated: 0, reason: "no-document" }
  }

  const text = await extractDocumentText(bytes, article.document_path)
  return _generateEmbeddingsFromText(supabase, article, text)
}

export const generateArticleEmbeddings = withObservability(
  SERVICE,
  "generateArticleEmbeddings",
  _generateArticleEmbeddings
)
