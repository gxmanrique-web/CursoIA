"use client"

import { useEffect, useState } from "react"

import { getArticleDocumentUrl } from "@/services/storage.service"

export type DocumentKind = "text" | "pdf" | "other"

function getDocumentKind(path: string): DocumentKind {
  const extension = path.slice(path.lastIndexOf(".")).toLowerCase()
  if (extension === ".txt") return "text"
  if (extension === ".pdf") return "pdf"
  return "other"
}

/**
 * Resuelve la URL firmada del documento de un artículo y, si es texto
 * plano, también su contenido para mostrarlo inline. PDF se puede
 * incrustar directamente en el navegador; DOCX no tiene una forma nativa
 * de renderizarse inline, así que solo se ofrece como descarga.
 */
export function useArticleDocument(documentPath: string | undefined) {
  const [url, setUrl] = useState<string | null>(null)
  const [textContent, setTextContent] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!documentPath) return
    let isMounted = true
    setIsLoading(true)
    setError(null)

    getArticleDocumentUrl(documentPath)
      .then(async (signedUrl) => {
        if (!isMounted) return
        setUrl(signedUrl)

        if (getDocumentKind(documentPath) === "text") {
          const response = await fetch(signedUrl)
          const text = await response.text()
          if (isMounted) setTextContent(text)
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(
            err instanceof Error ? err.message : "No se pudo cargar el documento."
          )
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [documentPath])

  return {
    url,
    textContent,
    isLoading,
    error,
    kind: documentPath ? getDocumentKind(documentPath) : ("other" as DocumentKind),
  }
}
