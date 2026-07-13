/**
 * Punto único de acceso a la lógica de negocio existente de ReadHub.
 *
 * No implementa nada nuevo: reexporta lo que ya existe en los paquetes
 * compartidos del monorepo para que las futuras Tools/Resources/Prompts de
 * este servidor importen todo desde un solo lugar en vez de repetir
 * `from "@readhub/ai"` / `from "@readhub/database"` en cada archivo nuevo.
 *
 * - `@readhub/ai`: pipeline RAG completo (búsqueda semántica + asistente
 *   conversacional + indexación) — es el candidato más directo a Tools MCP.
 *   `getArticleDocumentText` (texto plano del documento fuente, solo para
 *   .txt) y `resolveArticleContent`/`formatArticleBlock`
 *   (`article-content.service`, que la usa internamente) los reutilizan los
 *   Prompts y las Tools de análisis del servidor MCP para trabajar sobre el
 *   contenido real de un artículo en vez de solo su resumen.
 *   `compareArticles`/`extractMainThemes`/`generateGlobalSummary`/
 *   `findRelatedArticles`/`buildResearchContext` (`analysis.service`) son
 *   las capacidades de análisis avanzado del Prompt 7, construidas sobre
 *   `generateCompletion` (Claude) y `searchArticles`/`buildContext` (RAG)
 *   ya existentes — ninguna reimplementa acceso a Supabase ni al LLM.
 * - `@readhub/database`: cliente admin de Supabase (bypassa RLS), constantes
 *   de Storage, `getArticles`/`getArticleById`/`searchArticlesByKeyword`
 *   (equivalentes server-side de las consultas de lectura de
 *   `apps/web/services/article.service.ts` — ver justificación en
 *   `packages/database/src/articles.ts` de por qué no se reutiliza ese
 *   archivo tal cual), y `getAuthors`/`getAuthorById` (`authors.ts`) /
 *   `getPlatformStats` (`stats.ts`), añadidos para los Resources `authors`
 *   y `stats` del servidor MCP — ReadHub no tenía previamente ninguna
 *   consulta de perfiles ni de estadísticas agregadas.
 * - `@readhub/types`: tipos de dominio y de esquema de BD, para tipar los
 *   argumentos/resultados de las futuras Tools sin redefinirlos.
 *
 * Deliberadamente NO se reexporta `@readhub/shared`: `cn`/`formatDate`/
 * `formatAuthorLabel` son utilidades de presentación de la UI web, sin uso
 * previsible en un servidor MCP; solo `withObservability` podría ser
 * relevante, y ya viaja implícito dentro de los Services de `@readhub/ai`.
 */

export {
  searchArticles as searchArticlesSemantic,
  askAssistant,
  generateArticleEmbedding,
  getArticleDocumentText,
  resolveArticleContent,
  formatArticleBlock,
  compareArticles,
  extractMainThemes,
  generateGlobalSummary,
  findRelatedArticles,
  buildResearchContext,
} from "@readhub/ai"

export type {
  ArticleContent,
  ArticleRef,
  CompareArticlesResult,
  ExtractMainThemesResult,
  GenerateGlobalSummaryResult,
  FindRelatedArticlesResult,
  BuildResearchContextResult,
} from "@readhub/ai"

export {
  createAdminClient,
  ARTICLE_DOCUMENTS_BUCKET,
  ARTICLE_COVERS_BUCKET,
  getArticles,
  getArticleById,
  searchArticlesByKeyword,
  getAuthors,
  getAuthorById,
  getPlatformStats,
} from "@readhub/database"

export type { ArticleWithStats, AuthorWithStats, PlatformStats } from "@readhub/database"

export type { Article, Comment, Profile, Database } from "@readhub/types"
