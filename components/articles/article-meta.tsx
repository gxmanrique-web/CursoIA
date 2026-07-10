import { Calendar, Eye, User } from "lucide-react"

import { cn, formatDate } from "@/lib/utils"

interface ArticleMetaProps {
  authorName: string
  publishedAt: string | Date
  views?: number
  className?: string
}

function ArticleMeta({ authorName, publishedAt, views, className }: ArticleMetaProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground",
        className
      )}
    >
      <span className="flex items-center gap-1">
        <User className="size-3.5" />
        {authorName}
      </span>
      <span className="flex items-center gap-1">
        <Calendar className="size-3.5" />
        {formatDate(publishedAt)}
      </span>
      {typeof views === "number" && (
        <span className="flex items-center gap-1">
          <Eye className="size-3.5" />
          {views}
        </span>
      )}
    </div>
  )
}

export { ArticleMeta }
