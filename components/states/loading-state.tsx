import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

interface LoadingStateProps {
  message?: string
  className?: string
}

function LoadingState({ message = "Cargando…", className }: LoadingStateProps) {
  return (
    <div
      role="status"
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-16 text-center",
        className
      )}
    >
      <Spinner className="size-6 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}

export { LoadingState }
