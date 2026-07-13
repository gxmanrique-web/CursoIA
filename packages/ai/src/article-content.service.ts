import { getArticleById } from "@readhub/database"
import { withObservability } from "@readhub/shared/observability"

import { getArticleDocumentText } from "./embedding.service"

const SERVICE = "article-content.service"
const MAX_CONTENT_CHARS = 8000

export interface ArticleContent {
  id: string
  title: string
  summary: string | null
  content: string
}

/**
 * Resuelve el contenido de un artículo (`getArticleById` +
 * `getArticleDocumentText`, mismo fallback documento-completo→resumen que
 * usa `context-builder.service` para el RAG) en un solo lugar del monorepo,
 * para que tanto los Prompts como las Tools de análisis del servidor MCP lo
 * reutilicen sin reimplementar esta resolución cada uno por su lado.
 */
async function _resolveArticleContent(articleId: string): Promise<ArticleContent> {
  const article = await getArticleById(articleId)
  if (!article) {
    throw new Error(`No existe ningún artículo con id "${articleId}".`)
  }

  const documentText = await getArticleDocumentText(article.document_path)
  const content = (documentText ?? article.summary ?? "").slice(0, MAX_CONTENT_CHARS)

  return {
    id: article.id,
    title: article.title,
    summary: article.summary,
    content,
  }
}

/**
 * Formatea un `ArticleContent` como bloque de texto para un prompt, con el
 * mismo etiquetado (Título/Resumen/Contenido) que usa `embedding.service`
 * al componer el texto que se vectoriza — mantiene consistente cómo se
 * presenta un artículo al modelo en todo el proyecto.
 */
export function formatArticleBlock(article: ArticleContent): string {
  const parts = [
    `Título: ${article.title}`,
    article.summary ? `Resumen: ${article.summary}` : null,
    article.content
      ? `Contenido:\n${article.content}`
      : "(sin contenido de documento disponible; usa solo el título y el resumen anteriores)",
  ].filter((part): part is string => Boolean(part))

  return parts.join("\n")
}

export const resolveArticleContent = withObservability(
  SERVICE,
  "resolveArticleContent",
  _resolveArticleContent
)
