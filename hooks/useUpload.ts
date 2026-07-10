"use client"

import { useCallback, useState } from "react"

import { getCurrentUser } from "@/services/auth.service"
import { createArticle } from "@/services/article.service"
import { uploadArticleCover, uploadArticleDocument } from "@/services/storage.service"
import type { Article } from "@/types/article"

const ALLOWED_DOCUMENT_EXTENSIONS = [".txt", ".docx", ".pdf"]
const ALLOWED_IMAGE_MIME_PREFIX = "image/"

export interface UploadArticleInput {
  title: string
  summary?: string | null
  document: File | null
  cover: File | null
}

export interface UploadFieldErrors {
  title?: string
  document?: string
  cover?: string
}

function getExtension(fileName: string) {
  const index = fileName.lastIndexOf(".")
  return index === -1 ? "" : fileName.slice(index).toLowerCase()
}

// Reglas del Flujo 6 (Validaciones): título obligatorio, documento con
// formato permitido, imagen de portada obligatoria.
function validate(input: UploadArticleInput): UploadFieldErrors {
  const errors: UploadFieldErrors = {}

  if (!input.title.trim()) {
    errors.title = "El título no puede estar vacío."
  }

  if (!input.document) {
    errors.document = "Debes seleccionar un documento."
  } else if (!ALLOWED_DOCUMENT_EXTENSIONS.includes(getExtension(input.document.name))) {
    errors.document = "El documento debe tener formato TXT, DOCX o PDF."
  }

  if (!input.cover) {
    errors.cover = "Debes seleccionar una imagen de portada."
  } else if (!input.cover.type.startsWith(ALLOWED_IMAGE_MIME_PREFIX)) {
    errors.cover = "El archivo de portada debe ser una imagen válida."
  }

  return errors
}

export function useUpload() {
  const [isUploading, setIsUploading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<UploadFieldErrors>({})
  const [error, setError] = useState<string | null>(null)

  const publish = useCallback(async (input: UploadArticleInput): Promise<Article | null> => {
    const errors = validate(input)
    setFieldErrors(errors)
    setError(null)

    if (Object.keys(errors).length > 0) {
      return null
    }

    setIsUploading(true)
    try {
      // Se resuelve el usuario actual justo antes de mutar (en vez de recibir
      // un `authorId` ya calculado por props): un `user.id` capturado antes
      // en el render del componente puede quedar desactualizado respecto a
      // la sesión real (rotación de token, tab abierta un rato largo, etc.),
      // y la política RLS de `articles`/`storage.objects` exige que
      // `author_id`/la carpeta coincidan exactamente con `auth.uid()` en el
      // momento de la petición.
      const current = await getCurrentUser()
      if (!current) {
        throw new Error("Debes iniciar sesión para publicar un artículo.")
      }
      const authorId = current.user.id

      const articleId = crypto.randomUUID()

      const documentPath = await uploadArticleDocument(
        authorId,
        articleId,
        input.document as File
      )
      const imagePath = await uploadArticleCover(authorId, articleId, input.cover as File)

      return await createArticle({
        id: articleId,
        authorId,
        title: input.title.trim(),
        summary: input.summary ?? null,
        documentPath,
        imagePath,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo publicar el artículo.")
      throw err
    } finally {
      setIsUploading(false)
    }
  }, [])

  return { publish, isUploading, fieldErrors, error }
}
