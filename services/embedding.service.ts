import { createHash } from "node:crypto"
import OpenAI from "openai"

import { createAdminClient } from "@/lib/supabase/admin"
import { withObservability } from "@/lib/observability"
import { ARTICLE_DOCUMENTS_BUCKET } from "@/services/storage.service"

const SERVICE = "embedding.service"

// Debe coincidir exactamente con extensions.vector(1536) definido en la
// migración create_article_embeddings (Prompt 3). Cambiar de modelo/proveedor
// con otra dimensión requeriría además una migración de columna.
const EMBEDDING_MODEL = "text-embedding-3-small"
const EMBEDDING_DIMENSIONS = 1536

// Presupuesto de caracteres para el contenido del documento: aproxima el
// límite de contexto del modelo de embeddings (~8191 tokens) dejando margen
// para título y resumen, sin necesitar un tokenizer real en esta fase.
const MAX_CONTENT_CHARS = 20000

let openaiClient: OpenAI | null = null

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error(
        "OPENAI_API_KEY no está configurada. embedding.service la requiere para generar embeddings."
      )
    }
    openaiClient = new OpenAI({ apiKey })
  }
  return openaiClient
}

interface ArticleRecord {
  id: string
  title: string
  summary: string | null
  document_path: string
}

export interface ArticleEmbeddingResult {
  articleId: string
  embeddingModel: string
  dimensions: number
  contentHash: string
}

/**
 * Solo se extrae contenido real del documento fuente cuando es .txt.
 * PDF/DOCX se almacenan como binarios en Storage y este proyecto todavía no
 * tiene una etapa de extracción de texto (fuera del alcance de esta fase).
 * Para esos formatos el embedding se genera únicamente con título + resumen,
 * lo que degrada la calidad de la búsqueda semántica para esos artículos
 * hasta que exista un extractor dedicado.
 */
function isPlainTextDocument(documentPath: string): boolean {
  return documentPath.toLowerCase().endsWith(".txt")
}

async function fetchArticle(articleId: string): Promise<ArticleRecord> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("articles")
    .select("id, title, summary, document_path")
    .eq("id", articleId)
    .single()

  if (error) throw error
  return data
}

/**
 * Descarga y extrae el texto plano del documento fuente de un artículo
 * (null si el formato no es .txt, ver {@link isPlainTextDocument}).
 * Se exporta porque no es lógica exclusiva de embeddings: el Context
 * Builder (Prompt 7) también necesita leer el contenido completo del
 * artículo para construir el contexto del LLM, y debe reutilizar esta
 * misma extracción en vez de volver a implementarla.
 */
export async function getArticleDocumentText(documentPath: string): Promise<string | null> {
  if (!isPlainTextDocument(documentPath)) return null

  const supabase = createAdminClient()
  const { data, error } = await supabase.storage
    .from(ARTICLE_DOCUMENTS_BUCKET)
    .download(documentPath)

  if (error) throw error
  return await data.text()
}

/**
 * Compone el texto que se vectoriza. El título va primero y explícitamente
 * etiquetado porque concentra la señal temática más fuerte y más curada; el
 * resumen (también curado, escrito por el autor) le sigue; el contenido
 * completo del documento va al final porque es la señal más extensa y la
 * que se trunca si excede MAX_CONTENT_CHARS. Etiquetar cada sección evita
 * ambigüedad cuando falta resumen o contenido (documento no-.txt).
 */
function buildEmbeddingSource(article: ArticleRecord, documentText: string | null): string {
  const parts = [
    `Título: ${article.title}`,
    article.summary ? `Resumen: ${article.summary}` : null,
    documentText ? `Contenido: ${documentText.slice(0, MAX_CONTENT_CHARS)}` : null,
  ].filter((part): part is string => Boolean(part))

  return parts.join("\n\n")
}

function hashContent(text: string): string {
  return createHash("sha256").update(text).digest("hex")
}

/**
 * Genera el embedding de un texto arbitrario. Es la única función que habla
 * con el proveedor de embeddings; tanto _generateArticleEmbedding como el
 * futuro motor de búsqueda semántica (Prompt 6, que necesita vectorizar la
 * consulta del usuario) la reutilizan en vez de llamar a OpenAI por su cuenta.
 */
async function _generateEmbedding(text: string): Promise<number[]> {
  const client = getOpenAIClient()
  const response = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  })

  const embedding = response.data[0]?.embedding
  if (!embedding) {
    throw new Error("El proveedor de embeddings no devolvió ningún vector.")
  }
  if (embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Dimensión de embedding inesperada: se recibieron ${embedding.length}, se esperaban ${EMBEDDING_DIMENSIONS}.`
    )
  }

  return embedding
}

async function persistEmbedding(
  articleId: string,
  embedding: number[],
  contentHash: string
): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from("article_embeddings")
    .upsert(
      {
        article_id: articleId,
        embedding,
        embedding_model: EMBEDDING_MODEL,
        content_hash: contentHash,
      },
      { onConflict: "article_id" }
    )

  if (error) throw error
}

/**
 * Genera (o regenera) el embedding vigente de un artículo y lo persiste en
 * article_embeddings, reemplazando el anterior si existía (upsert por
 * article_id, único por artículo). Ejecución manual en esta fase: la
 * llamará el pipeline de indexación automática del Prompt 5, reutilizando
 * esta misma función sin duplicar lógica.
 */
async function _generateArticleEmbedding(articleId: string): Promise<ArticleEmbeddingResult> {
  const article = await fetchArticle(articleId)
  const documentText = await getArticleDocumentText(article.document_path)
  const source = buildEmbeddingSource(article, documentText)
  const contentHash = hashContent(source)

  const embedding = await _generateEmbedding(source)
  await persistEmbedding(articleId, embedding, contentHash)

  return {
    articleId,
    embeddingModel: EMBEDDING_MODEL,
    dimensions: embedding.length,
    contentHash,
  }
}

export const generateArticleEmbedding = withObservability(
  SERVICE,
  "generateArticleEmbedding",
  _generateArticleEmbedding
)

export const generateEmbedding = withObservability(SERVICE, "generateEmbedding", _generateEmbedding)
