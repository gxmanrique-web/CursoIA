import Link from "next/link"
import { FileText } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import type { ChatSource } from "@/hooks/useChat"

interface ChatSourcesProps {
  sources: ChatSource[]
}

/**
 * Panel de fuentes de una respuesta del asistente. Cada fuente enlaza
 * directamente al artículo original (misma ruta que usa el resto de la app,
 * /article/[id]) y muestra su relevancia como referencia rápida.
 */
function ChatSources({ sources }: ChatSourcesProps) {
  if (sources.length === 0) return null

  return (
    <div className="mt-2 flex flex-col gap-1.5 border-t border-border pt-2">
      <span className="text-xs font-medium text-muted-foreground">Fuentes utilizadas</span>
      <ul className="flex flex-col gap-1">
        {sources.map((source) => (
          <li key={source.articleId} className="flex items-center gap-2 text-sm">
            <FileText className="size-3.5 shrink-0 text-muted-foreground" />
            <Link
              href={`/article/${source.articleId}`}
              className="truncate text-foreground underline-offset-2 hover:underline"
            >
              {source.title}
            </Link>
            <Badge variant="outline" className="shrink-0">
              {Math.round(source.similarity * 100)}%
            </Badge>
          </li>
        ))}
      </ul>
    </div>
  )
}

export { ChatSources }
