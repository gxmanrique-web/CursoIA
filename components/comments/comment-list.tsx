import { CommentItem } from "@/components/comments/comment-item"
import { EmptyState } from "@/components/states/empty-state"
import { MessageSquare } from "lucide-react"

interface CommentListItem {
  id: string
  authorName: string
  createdAt: string | Date
  content: string
}

interface CommentListProps {
  comments: CommentListItem[]
  emptyMessage?: string
}

function CommentList({
  comments,
  emptyMessage = "Sé el primero en comentar.",
}: CommentListProps) {
  if (comments.length === 0) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="Aún no hay comentarios"
        description={emptyMessage}
      />
    )
  }

  return (
    <div className="space-y-4">
      {comments.map((comment) => (
        <CommentItem
          key={comment.id}
          authorName={comment.authorName}
          createdAt={comment.createdAt}
          content={comment.content}
        />
      ))}
    </div>
  )
}

export { CommentList }
export type { CommentListItem }
