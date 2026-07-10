import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { formatDate } from "@/lib/utils"

interface CommentItemProps {
  authorName: string
  createdAt: string | Date
  content: string
}

function CommentItem({ authorName, createdAt, content }: CommentItemProps) {
  const initials = authorName.slice(0, 2).toUpperCase()

  return (
    <div className="flex gap-3">
      <Avatar>
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 space-y-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-sm font-medium text-foreground">{authorName}</span>
          <span className="text-xs text-muted-foreground">{formatDate(createdAt)}</span>
        </div>
        <p className="text-sm text-foreground">{content}</p>
      </div>
    </div>
  )
}

export { CommentItem }
