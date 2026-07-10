"use client"

import { useCallback, useEffect, useState } from "react"

import {
  deleteArticle,
  getArticleById,
  getArticles,
  registerView,
  updateArticle,
  type ArticleWithStats,
  type UpdateArticleInput,
} from "@/services/article.service"
import { getArticleCoverUrl } from "@/services/storage.service"

export interface ArticleListItem extends ArticleWithStats {
  coverUrl: string | null
}

function withCoverUrl(article: ArticleWithStats): ArticleListItem {
  return {
    ...article,
    coverUrl: article.image_path ? getArticleCoverUrl(article.image_path) : null,
  }
}

export function useArticles() {
  const [articles, setArticles] = useState<ArticleListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchArticles = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await getArticles()
      setArticles(data.map(withCoverUrl))
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudieron cargar los artículos."
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchArticles()
  }, [fetchArticles])

  const removeArticle = useCallback(async (id: string) => {
    await deleteArticle(id)
    setArticles((current) => current.filter((article) => article.id !== id))
  }, [])

  return { articles, isLoading, error, refetch: fetchArticles, removeArticle }
}

/**
 * Artículo individual. Si se pasa `viewerId`, registra automáticamente una
 * visualización la primera vez que el artículo carga (Flujo 5 del laboratorio).
 */
export function useArticle(id: string | undefined, viewerId?: string) {
  const [article, setArticle] = useState<ArticleListItem | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchArticle = useCallback(async () => {
    if (!id) return
    setIsLoading(true)
    setError(null)
    try {
      const data = await getArticleById(id)
      setArticle(data ? withCoverUrl(data) : null)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo cargar el artículo."
      )
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchArticle()
  }, [fetchArticle])

  useEffect(() => {
    if (!id || !viewerId) return
    registerView(id, viewerId).catch(() => {
      // Best-effort: si falla el registro de la vista no debe romper la lectura.
    })
  }, [id, viewerId])

  const edit = useCallback(
    async (input: UpdateArticleInput) => {
      if (!id) return
      const updated = await updateArticle(id, input)
      setArticle((current) => (current ? { ...current, ...updated } : current))
    },
    [id]
  )

  return { article, isLoading, error, refetch: fetchArticle, updateArticle: edit }
}
