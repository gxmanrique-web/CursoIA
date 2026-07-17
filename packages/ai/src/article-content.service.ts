import { getArticleById, createAdminClient, ARTICLE_DOCUMENTS_BUCKET } from "@readhub/database"
import { withObservability } from "@readhub/shared/observability"

import { extractDocumentText } from "./document-extraction.service"

const SERVICE = "article-content.service"
const MAX_CONTENT_CHARS = 8000

export interface ArticleContent {
  id: string
  title: string
  summary: string | null
  content: string
}

/**
 * Descarga y extrae el texto plano del documento fuente de un artículo
 * (TXT/PDF/DOCX, ver document-extraction.service), null si Storage no tiene
 * el objeto o el documento no tiene texto extraíble. No pasa por
 * embedding.service porque este consumidor (MCP, sin sesión de usuario) no
 * necesita client-por-parámetro: usa siempre el cliente admin, igual que ya
 * hace getArticleById de @readhub/database.
 */
async function fetchArticleDocumentText(documentPath: string): Promise<string | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase.storage.from(ARTICLE_DOCUMENTS_BUCKET).download(documentPath)
  if (error || !data) return null

  return extractDocumentText(await data.arrayBuffer(), documentPath)
}

/**
 * Resuelve el contenido de un artículo (`getArticleById` +
 * `fetchArticleDocumentText`, mismo fallback documento-completo→resumen que
 * usaba `context-builder.service` para el RAG antes de que article_chunks
 * guardara el texto directamente) en un solo lugar del monorepo, para que
 * tanto los Prompts como las Tools de análisis del servidor MCP lo
 * reutilicen sin reimplementar esta resolución cada uno por su lado.
 */
async function _resolveArticleContent(articleId: string): Promise<ArticleContent> {
  const article = await getArticleById(articleId)
  if (!article) {
    throw new Error(`No existe ningún artículo con id "${articleId}".`)
  }

  const documentText = await fetchArticleDocumentText(article.document_path)
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
