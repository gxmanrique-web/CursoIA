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
 * - `@readhub/database`: cliente admin de Supabase (bypassa RLS) y
 *   constantes de Storage — necesario para cualquier Tool/Resource que
 *   lea artículos o documentos.
 * - `@readhub/types`: tipos de dominio y de esquema de BD, para tipar los
 *   argumentos/resultados de las futuras Tools sin redefinirlos.
 *
 * Deliberadamente NO se reexporta `@readhub/shared`: `cn`/`formatDate`/
 * `formatAuthorLabel` son utilidades de presentación de la UI web, sin uso
 * previsible en un servidor MCP; solo `withObservability` podría ser
 * relevante, y ya viaja implícito dentro de los Services de `@readhub/ai`.
 */

export { searchArticles, askAssistant, generateArticleEmbedding } from "@readhub/ai"

export { createAdminClient, ARTICLE_DOCUMENTS_BUCKET, ARTICLE_COVERS_BUCKET } from "@readhub/database"

export type { Article, Comment, Profile, Database } from "@readhub/types"
