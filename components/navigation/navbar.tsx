"use client"

import { useState } from "react"
import { Home, LogOut, Menu, Sparkles, Upload, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Logo } from "@/components/navigation/logo"
import { NavLink } from "@/components/navigation/nav-link"
import { useAuth } from "@/hooks/useAuth"

const NAV_LINKS = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/upload", label: "Cargar artículo", icon: Upload },
  { href: "/assistant", label: "Asistente", icon: Sparkles },
] as const

function Navbar({ userLabel }: { userLabel: string }) {
  const { signOut, isSigningOut } = useAuth()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4 sm:px-6 lg:gap-4">
        <Logo />

        <nav className="hidden items-center gap-1 md:flex" aria-label="Navegación principal">
          {NAV_LINKS.map((link) => (
            <NavLink key={link.href} {...link} />
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex lg:gap-3">
          <span className="max-w-24 truncate text-sm font-medium text-foreground lg:max-w-40">
            {userLabel}
          </span>
          <Button variant="outline" size="sm" onClick={signOut} disabled={isSigningOut}>
            <LogOut className="size-3.5" />
            Cerrar sesión
          </Button>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label={isMenuOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          {isMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </Button>
      </div>

      {isMenuOpen && (
        <div className="border-t border-border bg-background px-4 pt-2 pb-4 md:hidden">
          <nav className="flex flex-col gap-1" aria-label="Navegación principal (móvil)">
            {NAV_LINKS.map((link) => (
              <NavLink key={link.href} {...link} onClick={() => setIsMenuOpen(false)} />
            ))}
          </nav>

          <Separator className="my-3" />

          <div className="flex items-center justify-between gap-3 px-3">
            <span className="truncate text-sm font-medium text-foreground">{userLabel}</span>
            <Button variant="outline" size="sm" onClick={signOut} disabled={isSigningOut}>
              <LogOut className="size-3.5" />
              Cerrar sesión
            </Button>
          </div>
        </div>
      )}
    </header>
  )
}

export { Navbar }
