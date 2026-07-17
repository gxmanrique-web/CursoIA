"use client"

import { useCallback, useRef, useState } from "react"

export interface ChatSource {
  rank: number
  citationNumber: number
  chunkId: string
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

interface AssistantMetadata {
  llmInvoked: boolean
  documentsUsed: number
  totalTokens: number | null
}

type StreamEvent =
  | { type: "sources"; sources: ChatSource[] }
  | { type: "delta"; content: string }
  | { type: "done"; metadata: AssistantMetadata }
  | { type: "error"; message: string }

/**
 * Habla ÚNICAMENTE con /api/v1/chat: no conoce Supabase, ni Groq, ni Voyage.
 * Lee la respuesta NDJSON del Route Handler (Prompt 7) fragmento a
 * fragmento y actualiza el mensaje del asistente en tiempo real.
 *
 * Historial en memoria, vive mientras dure la sesión del componente (se
 * pierde al recargar).
 */
export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lastQueryRef = useRef<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const sendMessage = useCallback(
    async (query: string) => {
      const trimmed = query.trim()
      if (!trimmed || isLoading) return

      lastQueryRef.current = trimmed
      setError(null)
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", content: trimmed }])
      setIsLoading(true)

      const assistantMessageId = crypto.randomUUID()
      setMessages((prev) => [
        ...prev,
        { id: assistantMessageId, role: "assistant", content: "", isStreaming: true },
      ])

      const applyEvent = (event: StreamEvent) => {
        switch (event.type) {
          case "sources":
            setMessages((prev) =>
              prev.map((message) =>
                message.id === assistantMessageId ? { ...message, sources: event.sources } : message
              )
            )
            break
          case "delta":
            setMessages((prev) =>
              prev.map((message) =>
                message.id === assistantMessageId
                  ? { ...message, content: message.content + event.content }
                  : message
              )
            )
            break
          case "done":
            setMessages((prev) =>
              prev.map((message) =>
                message.id === assistantMessageId ? { ...message, isStreaming: false } : message
              )
            )
            break
          case "error":
            throw new Error(event.message)
        }
      }

      const controller = new AbortController()
      abortControllerRef.current = controller

      try {
        const response = await fetch("/api/v1/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: trimmed }),
          signal: controller.signal,
        })

        if (!response.ok) {
          const data = await response.json().catch(() => null)
          throw new Error(data?.error ?? "No se pudo generar una respuesta.")
        }
        if (!response.body) {
          throw new Error("La respuesta no incluyó contenido.")
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })

          // Un fragmento de red puede cortar una línea NDJSON por la mitad:
          // solo se procesan las líneas completas, la última (posiblemente
          // incompleta) se conserva en el búfer para la siguiente vuelta.
          const lines = buffer.split("\n")
          buffer = lines.pop() ?? ""

          for (const line of lines) {
            if (!line.trim()) continue
            applyEvent(JSON.parse(line) as StreamEvent)
          }
        }

        if (buffer.trim()) {
          applyEvent(JSON.parse(buffer) as StreamEvent)
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          // Cancelación intencional del usuario (stopGeneration): no es un
          // error que deba mostrarse.
          setMessages((prev) =>
            prev.map((message) =>
              message.id === assistantMessageId ? { ...message, isStreaming: false } : message
            )
          )
        } else {
          setError(err instanceof Error ? err.message : "No se pudo generar una respuesta.")
          setMessages((prev) => prev.filter((message) => message.id !== assistantMessageId))
        }
      } finally {
        setIsLoading(false)
        abortControllerRef.current = null
      }
    },
    [isLoading]
  )

  const stopGeneration = useCallback(() => {
    abortControllerRef.current?.abort()
  }, [])

  const retryLastMessage = useCallback(() => {
    if (lastQueryRef.current) {
      void sendMessage(lastQueryRef.current)
    }
  }, [sendMessage])

  const newConversation = useCallback(() => {
    abortControllerRef.current?.abort()
    lastQueryRef.current = null
    setMessages([])
    setError(null)
  }, [])

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    retryLastMessage,
    stopGeneration,
    newConversation,
  }
}
