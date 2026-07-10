"use client"

import { useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { useAuth } from "@/hooks/useAuth"
import { useArticle } from "@/hooks/useArticles"
import { useArticleDocument } from "@/hooks/useArticleDocument"
import { useComments } from "@/hooks/useComments"
import { useLikes } from "@/hooks/useLikes"

import { ArticleHeader } from "@/components/articles/article-header"
import { LikeButton } from "@/components/articles/like-button"
import { CommentForm } from "@/components/comments/comment-form"
import { CommentList } from "@/components/comments/comment-list"
import { LoadingState } from "@/components/states/loading-state"
import { ErrorState } from "@/components/states/error-state"
import { buttonVariants } from "@/components/ui/button"
import { formatAuthorLabel } from "@/lib/utils"

export default function ArticlePage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const { article, isLoading, error, refetch } = useArticle(id, user?.id)

  if (isLoading) {
    return <LoadingState message="Cargando artículo…" />
  }

  if (error || !article) {
    return (
      <ErrorState
        title="No se pudo cargar el artículo"
        description={error ?? "El artículo no existe o no está disponible."}
        onRetry={refetch}
      />
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <Link href="/" className={buttonVariants({ variant: "ghost" })}>
        <ArrowLeft className="size-4" />
        Volver al inicio
      </Link>

      <ArticleHeader
        title={article.title}
        coverUrl={article.coverUrl}
        authorName={formatAuthorLabel(article.author_id)}
        publishedAt={article.created_at}
        views={article.viewsCount}
      />

      <ArticleLikes
        articleId={article.id}
        userId={user?.id}
        initialCount={article.likesCount}
      />

      <ArticleDocument documentPath={article.document_path} />

      <ArticleComments articleId={article.id} userId={user?.id} />
    </div>
  )
}

function ArticleLikes({
  articleId,
  userId,
  initialCount,
}: {
  articleId: string
  userId: string | undefined
  initialCount: number
}) {
  const { liked, count, isToggling, toggle } = useLikes({ articleId, userId, initialCount })

  return (
    <LikeButton
      liked={liked}
      count={count}
      onToggle={toggle}
      disabled={!userId || isToggling}
    />
  )
}

function ArticleDocument({ documentPath }: { documentPath: string }) {
  const { url, textContent, kind, isLoading, error } = useArticleDocument(documentPath)

  return (
    <section className="space-y-3">
      <h2>Contenido</h2>

      {isLoading && <LoadingState message="Cargando documento…" />}

      {!isLoading && error && (
        <ErrorState title="No se pudo cargar el documento" description={error} />
      )}

      {!isLoading && !error && kind === "text" && (
        <pre className="overflow-x-auto rounded-xl border border-border bg-card p-4 font-sans text-sm leading-relaxed break-words whitespace-pre-wrap text-foreground shadow-card">
          {textContent}
        </pre>
      )}

      {!isLoading && !error && kind === "pdf" && url && (
        <iframe
          src={url}
          title="Documento del artículo"
          className="h-[50vh] w-full rounded-xl border border-border sm:h-[70vh]"
        />
      )}

      {!isLoading && !error && kind === "other" && url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({ variant: "outline" })}
        >
          Descargar documento
        </a>
      )}
    </section>
  )
}

function ArticleComments({
  articleId,
  userId,
}: {
  articleId: string
  userId: string | undefined
}) {
  const { comments, isLoading, isSubmitting, error, addComment } = useComments(articleId)
  const [value, setValue] = useState("")

  async function handleSubmit() {
    if (!userId || !value.trim()) return
    await addComment(userId, value.trim())
    setValue("")
  }

  return (
    <section className="space-y-4">
      <h2>Comentarios</h2>

      {isLoading ? (
        <LoadingState message="Cargando comentarios…" />
      ) : (
        <CommentList
          comments={comments.map((comment) => ({
            id: comment.id,
            authorName: formatAuthorLabel(comment.user_id),
            createdAt: comment.created_at,
            content: comment.comment,
          }))}
        />
      )}

      {userId && (
        <CommentForm
          value={value}
          onChange={setValue}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          error={error ?? undefined}
        />
      )}
    </section>
  )
}
