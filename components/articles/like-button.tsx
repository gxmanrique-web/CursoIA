"use client"

import { Heart } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface LikeButtonProps {
  liked: boolean
  count: number
  onToggle: () => void
  disabled?: boolean
  size?: "sm" | "default"
  className?: string
}

function LikeButton({
  liked,
  count,
  onToggle,
  disabled,
  size = "default",
  className,
}: LikeButtonProps) {
  return (
    <Button
      type="button"
      variant={liked ? "secondary" : "outline"}
      size={size}
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={liked}
      className={className}
    >
      <Heart
        className={cn("size-4", liked && "fill-destructive text-destructive")}
      />
      {count}
    </Button>
  )
}

export { LikeButton }
