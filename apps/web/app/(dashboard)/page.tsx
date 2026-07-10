"use client"

import { FileText } from "lucide-react"

import { useArticles } from "@/hooks/useArticles"
import { ArticleCard } from "@/components/cards/article-card"
import { ArticleCardSkeleton } from "@/components/cards/article-card-skeleton"
import { EmptyState } from "@/components/states/empty-state"
import { ErrorState } from "@/components/states/error-state"
import { formatAuthorLabel } from "@readhub/shared"

export default function HomePage() {
  const { articles, isLoading, error, refetch } = useArticles()

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1>Artículos</h1>
        <p className="text-sm text-muted-foreground">
          Descubre lo que la comunidad de ReadHub está publicando.
        </p>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <ArticleCardSkeleton key={index} />
          ))}
        </div>
      )}

      {!isLoading && error && (
        <ErrorState
          title="No se pudieron cargar los artículos"
          description={error}
          onRetry={refetch}
        />
      )}

      {!isLoading && !error && articles.length === 0 && (
        <EmptyState
          icon={FileText}
          title="Aún no hay artículos publicados"
          description="Cuando se publique un artículo, aparecerá aquí."
        />
      )}

      {!isLoading && !error && articles.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <ArticleCard
              key={article.id}
              href={`/article/${article.id}`}
              title={article.title}
              summary={article.summary}
              coverUrl={article.coverUrl}
              authorName={formatAuthorLabel(article.author_id)}
              publishedAt={article.created_at}
              views={article.viewsCount}
              likes={article.likesCount}
            />
          ))}
        </div>
      )}
    </div>
  )
}
