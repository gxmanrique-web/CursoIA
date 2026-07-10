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
 * - `@readhub/database`: cliente admin de Supabase (bypassa RLS), constantes
 *   de Storage, y `getArticles`/`getArticleById`/`searchArticlesByKeyword`
 *   (equivalentes server-side de las consultas de lectura de
 *   `apps/web/services/article.service.ts` — ver justificación en
 *   `packages/database/src/articles.ts` de por qué no se reutiliza ese
 *   archivo tal cual).
 * - `@readhub/types`: tipos de dominio y de esquema de BD, para tipar los
 *   argumentos/resultados de las futuras Tools sin redefinirlos.
 *
 * Deliberadamente NO se reexporta `@readhub/shared`: `cn`/`formatDate`/
 * `formatAuthorLabel` son utilidades de presentación de la UI web, sin uso
 * previsible en un servidor MCP; solo `withObservability` podría ser
 * relevante, y ya viaja implícito dentro de los Services de `@readhub/ai`.
 */

export { searchArticles as searchArticlesSemantic, askAssistant, generateArticleEmbedding } from "@readhub/ai"

export {
  createAdminClient,
  ARTICLE_DOCUMENTS_BUCKET,
  ARTICLE_COVERS_BUCKET,
  getArticles,
  getArticleById,
  searchArticlesByKeyword,
} from "@readhub/database"

export type { ArticleWithStats } from "@readhub/database"

export type { Article, Comment, Profile, Database } from "@readhub/types"
