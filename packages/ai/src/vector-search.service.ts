import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@readhub/types"
import { withObservability } from "@readhub/shared/observability"

import { generateEmbeddings, toPgVectorLiteral } from "./providers/voyage"

const SERVICE = "vector-search.service"

// Único origen del umbral de similitud: context-builder.service lo importa
// de aquí en vez de redefinirlo. La función SQL match_article_chunks no trae
// un valor por defecto propio (lo recibe como parámetro) precisamente para
// no crear un segundo origen dentro de la base de datos.
export const DEFAULT_SIMILARITY_THRESHOLD = 0.5
const DEFAULT_MATCH_COUNT = 5

export interface SemanticSearchOptions {
  matchThreshold?: number
  matchCount?: number
}

export interface SemanticSearchResult {
  rank: number
  chunkId: string
  articleId: string
  chunkIndex: number
  content: string
  title: string
  summary: string | null
  similarity: number
}

interface MatchArticleChunksRow {
  chunk_id: string
  article_id: string
  chunk_index: number
  content: string
  title: string
  summary: string | null
  similarity: number
}

/**
 * Invoca la función SQL de similitud y estructura el resultado. No construye
 * contexto ni llama al LLM: eso es responsabilidad de context-builder.service
 * y chat.service respectivamente. Tampoco reordena en cliente — la función
 * SQL ya ordena usando el índice HNSW, reordenar aquí sería redundante y
 * podría desalinearse silenciosamente de lo que el índice realmente eligió.
 */
async function _searchArticleChunks(
  supabase: SupabaseClient<Database>,
  query: string,
  options: SemanticSearchOptions = {}
): Promise<SemanticSearchResult[]> {
  const matchThreshold = options.matchThreshold ?? DEFAULT_SIMILARITY_THRESHOLD
  const matchCount = options.matchCount ?? DEFAULT_MATCH_COUNT

  // input_type "query": Voyage proyecta consultas y documentos de forma
  // distinta a como se indexaron los fragmentos.
  const [queryEmbedding] = await generateEmbeddings([query], "query")

  const { data, error } = await supabase.rpc("match_article_chunks", {
    query_embedding: toPgVectorLiteral(queryEmbedding),
    match_threshold: matchThreshold,
    match_count: matchCount,
  })

  if (error) throw error

  return ((data ?? []) as MatchArticleChunksRow[]).map((row, index) => ({
    rank: index + 1,
    chunkId: row.chunk_id,
    articleId: row.article_id,
    chunkIndex: row.chunk_index,
    content: row.content,
    title: row.title,
    summary: row.summary,
    similarity: row.similarity,
  }))
}

export const searchArticleChunks = withObservability(
  SERVICE,
  "searchArticleChunks",
  _searchArticleChunks
)
