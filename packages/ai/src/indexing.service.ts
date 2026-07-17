import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@readhub/types"
import { withObservability } from "@readhub/shared/observability"

import { extractDocumentText } from "./document-extraction.service"
import {
  downloadDocumentBytes,
  generateEmbeddingsFromText,
  type ArticleEmbeddingResult,
} from "./embedding.service"

const SERVICE = "indexing.service"

export interface IndexableArticle {
  id: string
  title: string
  summary: string | null
  documentPath: string
}

/**
 * Orquesta la indexación de un artículo YA resuelto: obtener el documento ->
 * extraer el texto -> delegar en embedding.service. No genera embeddings ni
 * habla con Voyage por su cuenta (reutiliza generateEmbeddingsFromText). No
 * resuelve autenticación ni autorización: eso es responsabilidad del Route
 * Handler, que además ya tiene el artículo resuelto (lo necesita igual para
 * comprobar la autoría), así que aquí no se repite esa consulta.
 *
 * No implementa ningún borrado de vectores: el ON DELETE CASCADE de
 * article_chunks (migración create_article_chunks) se encarga si el
 * artículo desaparece, sin depender de que este código llegue a correr.
 */
async function _indexArticle(
  supabase: SupabaseClient<Database>,
  article: IndexableArticle
): Promise<ArticleEmbeddingResult> {
  const bytes = await downloadDocumentBytes(supabase, article.documentPath)
  const text = bytes ? await extractDocumentText(bytes, article.documentPath) : null

  const result = await generateEmbeddingsFromText(supabase, article, text)

  // generateEmbeddingsFromText no distingue "documento ausente" de "sin
  // texto aprovechable" (recibe texto ya resuelto a null en ambos casos);
  // aquí sí se sabe cuál de los dos ocurrió, así que se corrige el motivo.
  if (!result.indexed && !bytes) {
    return { ...result, reason: "no-document" }
  }
  return result
}

export const indexArticle = withObservability(SERVICE, "indexArticle", _indexArticle)
