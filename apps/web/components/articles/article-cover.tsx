import { ImageOff } from "lucide-react"

import { cn } from "@readhub/shared"

interface ArticleCoverProps {
  src?: string | null
  alt: string
  className?: string
  loading?: "lazy" | "eager"
}

function ArticleCover({ src, alt, className, loading = "lazy" }: ArticleCoverProps) {
  if (!src) {
    return (
      <div
        className={cn(
          "flex aspect-video w-full items-center justify-center bg-muted text-muted-foreground",
          className
        )}
      >
        <ImageOff className="size-6" />
      </div>
    )
  }

  return (
    <div className={cn("aspect-video w-full overflow-hidden bg-muted", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- fuente dinámica (Supabase Storage), sin dominios fijos que declarar en next.config */}
      <img src={src} alt={alt} loading={loading} className="size-full object-cover" />
    </div>
  )
}

export { ArticleCover }
