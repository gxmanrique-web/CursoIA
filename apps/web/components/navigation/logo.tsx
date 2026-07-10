import Link from "next/link"
import { BookOpen } from "lucide-react"

import { cn } from "@readhub/shared"

function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 font-heading text-lg font-semibold text-foreground",
        className
      )}
    >
      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <BookOpen className="size-4" />
      </span>
      ReadHub
    </Link>
  )
}

export { Logo }
