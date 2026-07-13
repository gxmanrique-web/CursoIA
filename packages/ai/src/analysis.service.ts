import { getArticleById } from "@readhub/database"
import { withObservability } from "@readhub/shared/observability"

import { resolveArticleContent, formatArticleBlock } from "./article-content.service"
import { generateCompletion } from "./chat.service"
import { searchArticles, type SemanticSearchOptions, type SemanticSearchResult } from "./vector-search.service"
import { buildContext, type ContextBuilderOptions, type ContextSource } from "./context-builder.service"

const SERVICE = "analysis.service"

// Las respuestas de análisis (comparaciones, temas, resúmenes globales)
// suelen ser más largas que una respuesta conversacional de ask_assistant
// (MAX_RESPONSE_TOKENS en chat.service): más margen para cubrir varios
// artículos sin cortar la respuesta a mitad de una idea.
const ANALYSIS_MAX_TOKENS = 1536

export interface ArticleRef {
  id: string
  title: string
}

async function loadArticlesBlock(articleIds: string[]): Promise<{ refs: ArticleRef[]; block: string }> {
  const articles = await Promise.all(articleIds.map(resolveArticleContent))
  const refs = articles.map((article) => ({ id: article.id, title: article.title }))
  const block = articles
    .map((article, index) => `--- Artículo ${index + 1}: "${article.title}" ---\n${formatArticleBlock(article)}`)
    .join("\n\n")

  return { refs, block }
}

export interface CompareArticlesResult {
  analysis: string
  articles: ArticleRef[]
}

/**
 * Compara el contenido de varios artículos explícitos (identificados por
 * id), señalando similitudes, diferencias y posibles contradicciones.
 * Reutiliza `resolveArticleContent` (misma resolución de contenido que los
 * Prompts) y `generateCompletion` (mismo cliente de Claude que
 * `ask_assistant`) — a diferencia de `ask_assistant`, no pasa por búsqueda
 * semántica: los artículos a comparar los elige quien llama la Tool, no una
 * consulta.
 */
async function _compareArticles(articleIds: string[]): Promise<CompareArticlesResult> {
  if (articleIds.length < 2) {
    throw new Error("compareArticles requiere al menos dos ids de artículo.")
  }

  const { refs, block } = await loadArticlesBlock(articleIds)
  const prompt =
    `Compara los siguientes ${refs.length} artículos de ReadHub. Estructura tu respuesta en tres ` +
    `secciones: "Similitudes", "Diferencias" y "Posibles contradicciones" (indica "ninguna" si no ` +
    `encuentras contradicciones). Sé específico, citando el título del artículo correspondiente.\n\n${block}`

  const completion = await generateCompletion(prompt, { maxTokens: ANALYSIS_MAX_TOKENS })
  return { analysis: completion.text, articles: refs }
}

export interface ExtractMainThemesResult {
  themes: string
  articles: ArticleRef[]
}

/**
 * Extrae los temas principales de uno o varios artículos. Con un solo id,
 * son los temas de ese artículo; con varios, son los temas compartidos y
 * distintivos del conjunto — mismo mecanismo de carga que `compareArticles`,
 * solo cambia la instrucción del prompt.
 */
async function _extractMainThemes(articleIds: string[]): Promise<ExtractMainThemesResult> {
  if (articleIds.length === 0) {
    throw new Error("extractMainThemes requiere al menos un id de artículo.")
  }

  const { refs, block } = await loadArticlesBlock(articleIds)
  const prompt =
    (refs.length === 1
      ? "Identifica los temas principales del siguiente artículo de ReadHub, "
      : `Identifica los temas principales — compartidos y distintivos — de los siguientes ${refs.length} artículos de ReadHub, `) +
    "como una lista con una breve explicación de cada tema.\n\n" +
    block

  const completion = await generateCompletion(prompt, { maxTokens: ANALYSIS_MAX_TOKENS })
  return { themes: completion.text, articles: refs }
}

export interface GenerateGlobalSummaryResult {
  summary: string
  articles: ArticleRef[]
}

/**
 * Genera un resumen único que integra varios artículos (a diferencia de
 * `summarize_article`, que resume uno solo), útil para tener una visión de
 * conjunto de un tema cubierto por múltiples publicaciones de ReadHub.
 */
async function _generateGlobalSummary(articleIds: string[]): Promise<GenerateGlobalSummaryResult> {
  if (articleIds.length === 0) {
    throw new Error("generateGlobalSummary requiere al menos un id de artículo.")
  }

  const { refs, block } = await loadArticlesBlock(articleIds)
  const prompt =
    `Redacta un resumen global que integre el contenido de los siguientes ${refs.length} artículo(s) ` +
    `de ReadHub en un texto único y coherente (no un resumen por separado de cada uno), destacando ` +
    `cómo se relacionan entre sí.\n\n${block}`

  const completion = await generateCompletion(prompt, { maxTokens: ANALYSIS_MAX_TOKENS })
  return { summary: completion.text, articles: refs }
}

export interface FindRelatedArticlesResult {
  articleId: string
  articleTitle: string
  related: SemanticSearchResult[]
}

/**
 * Identifica artículos relacionados con uno dado, reutilizando
 * `searchArticles` (búsqueda semántica) con el propio título+resumen del
 * artículo como consulta — no reimplementa ninguna lógica de similitud
 * nueva, solo compone la consulta a partir de un artículo en vez de texto
 * libre, y descarta el propio artículo de los resultados.
 */
async function _findRelatedArticles(
  articleId: string,
  options: SemanticSearchOptions = {}
): Promise<FindRelatedArticlesResult> {
  const article = await getArticleById(articleId)
  if (!article) {
    throw new Error(`No existe ningún artículo con id "${articleId}".`)
  }

  const query = [article.title, article.summary].filter(Boolean).join("\n")
  const matchCount = (options.matchCount ?? 5) + 1
  const results = await searchArticles(query, { ...options, matchCount })
  const related = results.filter((result) => result.articleId !== articleId)

  return { articleId, articleTitle: article.title, related }
}

export interface BuildResearchContextOptions {
  search?: SemanticSearchOptions
  context?: ContextBuilderOptions
}

export interface BuildResearchContextResult {
  prompt: string
  sources: ContextSource[]
  documentsRetrieved: number
  documentsUsed: number
}

/**
 * Construye (sin invocar a Claude) el contexto documental para una consulta
 * de investigación: mismo pipeline recuperación + construcción de prompt
 * que usa internamente `askAssistant`, pero expuesto sin la llamada al LLM,
 * para que un cliente MCP externo pueda inspeccionar las fuentes o usarlas
 * con su propio modelo.
 */
async function _buildResearchContext(
  query: string,
  options: BuildResearchContextOptions = {}
): Promise<BuildResearchContextResult> {
  const searchResults = await searchArticles(query, options.search)
  const context = await buildContext({ query, documents: searchResults }, options.context)

  return {
    prompt: context.prompt,
    sources: context.sources,
    documentsRetrieved: searchResults.length,
    documentsUsed: context.documentsUsed,
  }
}

export const compareArticles = withObservability(SERVICE, "compareArticles", _compareArticles)
export const extractMainThemes = withObservability(SERVICE, "extractMainThemes", _extractMainThemes)
export const generateGlobalSummary = withObservability(
  SERVICE,
  "generateGlobalSummary",
  _generateGlobalSummary
)
export const findRelatedArticles = withObservability(SERVICE, "findRelatedArticles", _findRelatedArticles)
export const buildResearchContext = withObservability(
  SERVICE,
  "buildResearchContext",
  _buildResearchContext
)
