"use client"

import { useCallback, useEffect, useState } from "react"

import { hasLiked, likeArticle, unlikeArticle } from "@/services/article.service"

interface UseLikesOptions {
  articleId: string
  userId: string | undefined
  initialCount?: number
}

export function useLikes({ articleId, userId, initialCount = 0 }: UseLikesOptions) {
  const [liked, setLiked] = useState(false)
  const [count, setCount] = useState(initialCount)
  const [isLoading, setIsLoading] = useState(true)
  const [isToggling, setIsToggling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) {
      setIsLoading(false)
      return
    }

    let isMounted = true
    setIsLoading(true)

    hasLiked(articleId, userId)
      .then((result) => {
        if (isMounted) setLiked(result)
      })
      .catch(() => {
        // Si falla la comprobación, se asume "no le ha dado like" por defecto.
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [articleId, userId])

  // Un usuario no puede registrar más de un "me gusta" sobre el mismo
  // artículo (Flujo 8): el toggle solo alterna su propio like, ya único
  // por la restricción UNIQUE(article_id, user_id) de la tabla.
  const toggle = useCallback(async () => {
    if (!userId || isToggling) return

    const wasLiked = liked
    setIsToggling(true)
    setError(null)
    setLiked(!wasLiked)
    setCount((current) => current + (wasLiked ? -1 : 1))

    try {
      if (wasLiked) {
        await unlikeArticle(articleId, userId)
      } else {
        await likeArticle(articleId, userId)
      }
    } catch (err) {
      setLiked(wasLiked)
      setCount((current) => current + (wasLiked ? 1 : -1))
      setError(
        err instanceof Error ? err.message : "No se pudo actualizar el 'me gusta'."
      )
    } finally {
      setIsToggling(false)
    }
  }, [articleId, userId, liked, isToggling])

  return { liked, count, isLoading, isToggling, error, toggle }
}
