import Link from "next/link"
import { FileText } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import type { ChatSource } from "@/hooks/useChat"

interface ChatSourcesProps {
  sources: ChatSource[]
}

/**
 * Panel de fuentes de una respuesta del asistente. El número visible de
 * cada fuente (citationNumber) coincide con la cita [n] que el modelo
 * intercala en el texto de la respuesta (prompts.ts numera los documentos
 * en el mismo orden), para que el lector pueda verificar de dónde sale cada
 * afirmación. Cada fuente enlaza al artículo original y muestra su
 * relevancia como porcentaje.
 */
function ChatSources({ sources }: ChatSourcesProps) {
  if (sources.length === 0) return null

  return (
    <div className="mt-2 flex flex-col gap-1.5 border-t border-border pt-2">
      <span className="text-xs font-medium text-muted-foreground">Fuentes utilizadas</span>
      <ul className="flex flex-col gap-1">
        {sources.map((source) => (
          <li key={source.chunkId} className="flex items-center gap-2 text-sm">
            <span
              className="flex size-4 shrink-0 items-center justify-center rounded-full bg-muted text-[0.65rem] font-medium text-muted-foreground"
              aria-hidden="true"
            >
              {source.citationNumber}
            </span>
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
