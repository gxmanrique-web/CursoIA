"use client"

import { useCallback, useEffect, useState } from "react"

import { createComment, getCommentsByArticle } from "@/services/comment.service"
import type { Comment } from "@/types/comment"

export function useComments(articleId: string | undefined) {
  const [comments, setComments] = useState<Comment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchComments = useCallback(async () => {
    if (!articleId) return
    setIsLoading(true)
    setError(null)
    try {
      const data = await getCommentsByArticle(articleId)
      setComments(data)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudieron cargar los comentarios."
      )
    } finally {
      setIsLoading(false)
    }
  }, [articleId])

  useEffect(() => {
    fetchComments()
  }, [fetchComments])

  const addComment = useCallback(
    async (userId: string, content: string) => {
      if (!articleId) return
      setIsSubmitting(true)
      setError(null)
      try {
        const created = await createComment(articleId, userId, content)
        // Se agrega en el momento, sin recargar la página (Flujo 7).
        setComments((current) => [...current, created])
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "No se pudo publicar el comentario."
        )
        throw err
      } finally {
        setIsSubmitting(false)
      }
    },
    [articleId]
  )

  return { comments, isLoading, isSubmitting, error, addComment, refetch: fetchComments }
}
