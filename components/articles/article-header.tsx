import { ArticleCover } from "@/components/articles/article-cover"
import { ArticleMeta } from "@/components/articles/article-meta"

interface ArticleHeaderProps {
  title: string
  coverUrl?: string | null
  authorName: string
  publishedAt: string | Date
  views?: number
}

function ArticleHeader({
  title,
  coverUrl,
  authorName,
  publishedAt,
  views,
}: ArticleHeaderProps) {
  return (
    <header className="space-y-4">
      <ArticleCover
        src={coverUrl}
        alt={title}
        loading="eager"
        className="rounded-xl"
      />
      <div className="space-y-2">
        <h1>{title}</h1>
        <ArticleMeta authorName={authorName} publishedAt={publishedAt} views={views} />
      </div>
    </header>
  )
}

export { ArticleHeader }
