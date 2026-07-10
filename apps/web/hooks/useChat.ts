"use client"

import { useCallback, useEffect, useRef, useState } from "react"

export interface ChatSource {
  rank: number
  articleId: string
  title: string
  similarity: number
}

export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  sources?: ChatSource[]
  isStreaming?: boolean
}

const REVEAL_INTERVAL_MS = 12
const REVEAL_CHUNK_SIZE = 3

/**
 * Historial de conversación en memoria, vive mientras dure la sesión del
 * componente (se pierde al recargar). Se modela como una lista de mensajes
 * con id propio para poder evolucionar más adelante hacia un historial
 * persistido en Supabase sin cambiar la forma en que los componentes lo
 * consumen (Prompt 9, sección "Historial").
 */
export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lastQueryRef = useRef<string | null>(null)
  const revealTimers = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map())

  useEffect(() => {
    const timers = revealTimers.current
    return () => {
      timers.forEach((timer) => clearInterval(timer))
      timers.clear()
    }
  }, [])

  /**
   * chat.service.ts (Prompt 8) devuelve la respuesta completa de una sola
   * vez; no hay streaming real de Claude en esta fase, y modificar esa
   * integración está fuera del alcance del Prompt 9 (restringido
   * explícitamente a la capa de interfaz). Esto simula el renderizado
   * progresivo revelando la respuesta ya recibida en el cliente, para
   * cumplir el requisito de UX sin tocar Services ni la integración con IA.
   */
  const revealProgressively = useCallback((messageId: string, fullText: string) => {
    if (fullText.length === 0) {
      setMessages((prev) =>
        prev.map((message) =>
          message.id === messageId ? { ...message, isStreaming: false } : message
        )
      )
      return
    }

    let shown = 0
    const timer = setInterval(() => {
      shown = Math.min(fullText.length, shown + REVEAL_CHUNK_SIZE)
      const isDone = shown >= fullText.length

      setMessages((prev) =>
        prev.map((message) =>
          message.id === messageId
            ? { ...message, content: fullText.slice(0, shown), isStreaming: !isDone }
            : message
        )
      )

      if (isDone) {
        clearInterval(timer)
        revealTimers.current.delete(messageId)
      }
    }, REVEAL_INTERVAL_MS)

    revealTimers.current.set(messageId, timer)
  }, [])

  const sendMessage = useCallback(
    async (query: string) => {
      const trimmed = query.trim()
      if (!trimmed || isLoading) return

      lastQueryRef.current = trimmed
      setError(null)
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", content: trimmed }])
      setIsLoading(true)

      try {
        const response = await fetch("/api/v1/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: trimmed }),
        })

        const data = await response.json()
        if (!response.ok) {
          throw new Error(data?.error ?? "No se pudo generar una respuesta.")
        }

        const assistantMessageId = crypto.randomUUID()
        setMessages((prev) => [
          ...prev,
          {
            id: assistantMessageId,
            role: "assistant",
            content: "",
            sources: data.sources,
            isStreaming: true,
          },
        ])
        revealProgressively(assistantMessageId, data.answer as string)
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo generar una respuesta.")
      } finally {
        setIsLoading(false)
      }
    },
    [isLoading, revealProgressively]
  )

  const retryLastMessage = useCallback(() => {
    if (lastQueryRef.current) {
      void sendMessage(lastQueryRef.current)
    }
  }, [sendMessage])

  return { messages, isLoading, error, sendMessage, retryLastMessage }
}
