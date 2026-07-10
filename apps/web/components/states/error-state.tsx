import { AlertTriangle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@readhub/shared"

interface ErrorStateProps {
  title?: string
  description?: string
  onRetry?: () => void
  retryLabel?: string
  className?: string
}

function ErrorState({
  title = "Algo salió mal",
  description = "Ocurrió un error inesperado. Inténtalo de nuevo.",
  onRetry,
  retryLabel = "Reintentar",
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-border py-16 text-center",
        className
      )}
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="size-5" />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  )
}

export { ErrorState }
