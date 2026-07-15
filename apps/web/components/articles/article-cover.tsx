import Image from "next/image"
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

  const isPriority = loading === "eager"

  return (
    <div className={cn("relative aspect-video w-full overflow-hidden bg-muted", className)}>
      <Image
        src={src}
        alt={alt}
        fill
        priority={isPriority}
        {...(!isPriority && { loading: "lazy" })}
        sizes="(min-width: 1024px) 640px, 100vw"
        className="object-cover"
      />
    </div>
  )
}

export { ArticleCover }
