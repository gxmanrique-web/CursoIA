import { Loader2 } from "lucide-react"

import { cn } from "@readhub/shared"

function Spinner({ className }: { className?: string }) {
  return (
    <Loader2
      role="status"
      aria-label="Cargando"
      className={cn("size-4 animate-spin", className)}
    />
  )
}

export { Spinner }
