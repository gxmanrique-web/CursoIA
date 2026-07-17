"use client"

import { useState } from "react"
import { Send, Square } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

interface ChatInputProps {
  onSend: (query: string) => void
  isStreaming?: boolean
  onStop?: () => void
  disabled?: boolean
}

function ChatInput({ onSend, isStreaming, onStop, disabled }: ChatInputProps) {
  const [value, setValue] = useState("")

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!value.trim() || disabled) return
    onSend(value)
    setValue("")
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Enter envía; Shift+Enter inserta un salto de línea (comportamiento
    // nativo del textarea, no se intercepta).
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      handleSubmit(event)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2">
      <Textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Pregúntale algo a ReadHub sobre los artículos publicados…"
        disabled={disabled}
        className="min-h-11 resize-none"
        rows={1}
        aria-label="Escribe tu consulta para el asistente"
      />
      {isStreaming ? (
        <Button
          type="button"
          size="icon"
          variant="outline"
          onClick={onStop}
          aria-label="Detener respuesta"
        >
          <Square className="size-3.5" />
        </Button>
      ) : (
        <Button type="submit" size="icon" disabled={disabled || !value.trim()} aria-label="Enviar">
          <Send className="size-4" />
        </Button>
      )}
    </form>
  )
}

export { ChatInput }
