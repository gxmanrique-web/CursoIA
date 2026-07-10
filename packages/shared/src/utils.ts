import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(date))
}

/**
 * `profiles` no tiene columna de nombre/email y su RLS solo permite leer el
 * perfil propio, así que no hay forma de mostrar el nombre real de otro
 * autor. Mientras esa limitación no se resuelva (política nueva o columna
 * de nombre público), se muestra un identificador corto y legible.
 */
export function formatAuthorLabel(authorId: string) {
  return `Usuario ${authorId.slice(0, 8)}`
}
