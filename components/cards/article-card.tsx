import Link from "next/link"
import { Heart } from "lucide-react"

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ArticleCover } from "@/components/articles/article-cover"
import { ArticleMeta } from "@/components/articles/article-meta"

interface ArticleCardProps {
  href: string
  title: string
  summary?: string | null
  coverUrl?: string | null
  authorName: string
  publishedAt: string | Date
  views: number
  likes: number
}

function ArticleCard({
  href,
  title,
  summary,
  coverUrl,
  authorName,
  publishedAt,
  views,
  likes,
}: ArticleCardProps) {
  return (
    <Card className="h-full transition-shadow hover:shadow-card-hover">
      <Link href={href} className="flex h-full flex-col focus-visible:outline-none">
        <ArticleCover src={coverUrl} alt={title} />
        <CardHeader>
          <CardTitle className="line-clamp-2 text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex-1">
          {summary && (
            <p className="line-clamp-2 text-sm text-muted-foreground">{summary}</p>
          )}
        </CardContent>
        <CardFooter className="flex flex-col items-start gap-2 border-t bg-transparent sm:flex-row sm:items-center sm:justify-between">
          <ArticleMeta authorName={authorName} publishedAt={publishedAt} views={views} />
          <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
            <Heart className="size-3.5" />
            {likes}
          </span>
        </CardFooter>
      </Link>
    </Card>
  )
}

export { ArticleCard }
