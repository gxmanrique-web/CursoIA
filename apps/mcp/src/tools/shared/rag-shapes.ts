import { z } from "zod"

/**
 * Forma zod compartida por las Tools que citan fuentes de una respuesta de
 * RAG (`ask_assistant`, `build_research_context`), reflejando `ContextSource`
 * (`@readhub/ai`).
 */
export const sourceShape = z.object({
  rank: z.number(),
  citationNumber: z.number(),
  chunkId: z.string(),
  articleId: z.string(),
  title: z.string(),
  similarity: z.number(),
})

/**
 * Forma zod compartida por las Tools que devuelven resultados de búsqueda
 * semántica (`search_articles_semantic`, `find_related_articles`),
 * reflejando `SemanticSearchResult` (`@readhub/ai`): un fragmento indexado
 * (article_chunks), no el artículo completo.
 */
export const semanticResultShape = z.object({
  rank: z.number(),
  chunkId: z.string(),
  articleId: z.string(),
  chunkIndex: z.number(),
  content: z.string(),
  title: z.string(),
  summary: z.string().nullable(),
  similarity: z.number(),
})

/**
 * Forma zod compartida por las Tools de análisis avanzado que devuelven
 * artículos de referencia (`compare_articles`, `extract_main_themes`,
 * `generate_global_summary`), reflejando `ArticleRef` (`@readhub/ai`).
 */
export const articleRefShape = z.object({
  id: z.string(),
  title: z.string(),
})
