import { createClient } from "@/lib/supabase/client"
import { ARTICLE_DOCUMENTS_BUCKET, ARTICLE_COVERS_BUCKET } from "@readhub/database"

/**
 * Los nombres de bucket viven en `@readhub/database` (única fuente de
 * verdad, también consumida por `@readhub/ai` para localizar el documento
 * fuente de un artículo al generar su embedding) — ver justificación en
 * `packages/database/src/storage-buckets.ts`. Las rutas se organizan como
 * "<authorId>/<articleId>/<archivo>" porque las políticas de
 * `storage.objects` autorizan la escritura por el primer segmento de la
 * ruta (el autor), sin depender de que la fila del artículo ya exista
 * (los archivos se suben antes de insertar el artículo).
 */

/**
 * Supabase Storage usa claves estilo S3: rechaza espacios, tildes y otros
 * caracteres no ASCII con "Invalid key" (p. ej. "Arte - ficha técnica.pdf").
 * Se normaliza el nombre del archivo antes de construir la ruta; el nombre
 * original que ve el usuario en la UI (`FileInput`) no se toca.
 */
function sanitizeFileName(fileName: string): string {
  const extensionIndex = fileName.lastIndexOf(".")
  const base = extensionIndex === -1 ? fileName : fileName.slice(0, extensionIndex)
  const extension = extensionIndex === -1 ? "" : fileName.slice(extensionIndex)

  const safeBase = base
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quita acentos/diacríticos (é -> e)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  const safeExtension = extension.toLowerCase().replace(/[^a-z0-9.]/g, "")

  return `${safeBase || "archivo"}${safeExtension}`
}

function buildPath(authorId: string, articleId: string, file: File) {
  return `${authorId}/${articleId}/${sanitizeFileName(file.name)}`
}

export async function uploadArticleDocument(
  authorId: string,
  articleId: string,
  file: File
): Promise<string> {
  const supabase = createClient()
  const path = buildPath(authorId, articleId, file)

  const { error } = await supabase.storage
    .from(ARTICLE_DOCUMENTS_BUCKET)
    .upload(path, file, { upsert: true })

  if (error) throw error
  return path
}

export async function uploadArticleCover(
  authorId: string,
  articleId: string,
  file: File
): Promise<string> {
  const supabase = createClient()
  const path = buildPath(authorId, articleId, file)

  const { error } = await supabase.storage
    .from(ARTICLE_COVERS_BUCKET)
    .upload(path, file, { upsert: true })

  if (error) throw error
  return path
}

/** El bucket de portadas es público: URL estable, sin expiración. */
export function getArticleCoverUrl(path: string): string {
  const supabase = createClient()
  const {
    data: { publicUrl },
  } = supabase.storage.from(ARTICLE_COVERS_BUCKET).getPublicUrl(path)

  return publicUrl
}

/** El bucket de documentos es privado: URL firmada y temporal. */
export async function getArticleDocumentUrl(
  path: string,
  expiresInSeconds = 3600
): Promise<string> {
  const supabase = createClient()
  const { data, error } = await supabase.storage
    .from(ARTICLE_DOCUMENTS_BUCKET)
    .createSignedUrl(path, expiresInSeconds)

  if (error) throw error
  return data.signedUrl
}

export async function removeArticleDocument(path: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.storage.from(ARTICLE_DOCUMENTS_BUCKET).remove([path])

  if (error) throw error
}

export async function removeArticleCover(path: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.storage.from(ARTICLE_COVERS_BUCKET).remove([path])

  if (error) throw error
}
