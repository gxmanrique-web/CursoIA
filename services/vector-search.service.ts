import { createAdminClient } from "@/lib/supabase/admin"
import { withObservability } from "@/lib/observability"
import { generateEmbedding } from "@/services/embedding.service"

const SERVICE = "vector-search.service"

// Top-K por defecto: 5 da suficiente diversidad de fuentes para fundamentar
// una respuesta sin sobrecargar el prompt del LLM con documentos marginales;
// el Context Builder (Prompt 7) podrá recortar aún más si hace falta.
const DEFAULT_MATCH_COUNT = 5

// Umbral de similitud coseno por defecto (rango 0-1 tras 1 - distancia).
// 0.5 es un punto medio deliberado: suficientemente bajo para no descartar
// artículos relevantes ante consultas parafraseadas (pares realmente
// relacionados con text-embedding-3-small suelen rondar 0.4-0.7), y
// suficientemente alto para filtrar contenido claramente no relacionado
// (que típicamente cae por debajo de 0.3).
const DEFAULT_MATCH_THRESHOLD = 0.5

export interface SemanticSearchOptions {
  matchCount?: number
  matchThreshold?: number
}

export interface SemanticSearchResult {
  rank: number
  articleId: string
  title: string
  summary: string | null
  documentPath: string
  similarity: number
}

/**
 * Busca los artículos más relevantes para una consulta en lenguaje natural.
 * Flujo: consulta -> embedding de consulta (embedding.service) -> similitud
 * vectorial (match_article_embeddings, Prompt 3, extendida en el Prompt 11
 * para devolver document_path directamente y evitar una segunda consulta a
 * articles) -> resultado estructurado listo para el Context Builder.
 *
 * Corre en el servidor: tanto generateEmbedding (OPENAI_API_KEY) como la
 * lectura de article_embeddings (sin políticas RLS para anon/authenticated,
 * ver Prompt 3) requieren el cliente admin con SUPABASE_SERVICE_ROLE_KEY.
 */
async function _searchArticles(
  query: string,
  options: SemanticSearchOptions = {}
): Promise<SemanticSearchResult[]> {
  const matchCount = options.matchCount ?? DEFAULT_MATCH_COUNT
  const matchThreshold = options.matchThreshold ?? DEFAULT_MATCH_THRESHOLD

  const queryEmbedding = await generateEmbedding(query)

  const supabase = createAdminClient()
  const { data: matches, error } = await supabase.rpc("match_article_embeddings", {
    query_embedding: queryEmbedding,
    match_threshold: matchThreshold,
    match_count: matchCount,
  })

  if (error) throw error
  if (!matches) return []

  return matches.map((match, index) => ({
    rank: index + 1,
    articleId: match.article_id,
    title: match.title,
    summary: match.summary,
    documentPath: match.document_path,
    similarity: match.similarity,
  }))
}

export const searchArticles = withObservability(SERVICE, "searchArticles", _searchArticles)
