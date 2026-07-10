"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { LucideIcon } from "lucide-react"

import { cn } from "@readhub/shared"

interface NavLinkProps {
  href: string
  label: string
  icon: LucideIcon
  onClick?: () => void
  className?: string
}

function NavLink({ href, label, icon: Icon, onClick, className }: NavLinkProps) {
  const pathname = usePathname()
  const isActive = pathname === href

  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        isActive && "bg-accent text-accent-foreground",
        className
      )}
    >
      <Icon className="size-4" />
      {label}
    </Link>
  )
}

export { NavLink }
