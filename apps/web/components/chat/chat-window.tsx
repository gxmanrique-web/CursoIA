"use client"

import { useEffect, useMemo, useRef } from "react"
import { Sparkles, RotateCcw } from "lucide-react"

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Alert, AlertDescription, AlertAction } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/states/empty-state"
import { ChatMessage } from "@/components/chat/chat-message"
import { ChatInput } from "@/components/chat/chat-input"
import { useChat } from "@/hooks/useChat"
import { useArticles } from "@/hooks/useArticles"

const MAX_SUGGESTIONS = 3

function ChatWindow() {
  const { messages, isLoading, error, sendMessage, retryLastMessage, stopGeneration, newConversation } =
    useChat()
  const { articles } = useArticles()
  const scrollAnchorRef = useRef<HTMLDivElement>(null)
  const scrollFrameRef = useRef<number | null>(null)

  // Sugerencias derivadas de los artículos publicados en este momento, no
  // texto fijo: si se escribieran a mano mencionarían artículos que ya no
  // existen en cuanto el contenido cambie, y el asistente sugeriría temas
  // que no puede responder. useArticles ya solo lista artículos públicos.
  const suggestions = useMemo(
    () =>
      articles.slice(0, MAX_SUGGESTIONS).map((article) => `¿De qué trata "${article.title}"?`),
    [articles]
  )

  useEffect(() => {
    // El array de mensajes cambia en CADA token del streaming: agendar el
    // scroll en un requestAnimationFrame cancelable hace que una ráfaga de
    // tokens produzca UN solo desplazamiento en vez de encadenar animaciones
    // que se cancelan entre sí (lo que provoca tirones y bloquea el hilo
    // principal). Salto instantáneo mientras llega texto; suave en reposo.
    if (scrollFrameRef.current !== null) {
      cancelAnimationFrame(scrollFrameRef.current)
    }
    scrollFrameRef.current = requestAnimationFrame(() => {
      scrollAnchorRef.current?.scrollIntoView({ behavior: isLoading ? "auto" : "smooth" })
      scrollFrameRef.current = null
    })

    return () => {
      if (scrollFrameRef.current !== null) cancelAnimationFrame(scrollFrameRef.current)
    }
  }, [messages, isLoading])

  const lastMessage = messages[messages.length - 1]
  // El indicador de carga solo cubre la fase de RECUPERACIÓN: en cuanto
  // llegan las fuentes (evento "sources", aunque sea con un arreglo vacío)
  // ya hay algo que pintar, así que se retira ahí en vez de esperar a que
  // termine toda la respuesta.
  const isRetrieving =
    isLoading && lastMessage?.role === "assistant" && lastMessage.sources === undefined

  return (
    <Card className="flex h-[70vh] flex-col">
      <CardHeader className="flex-row items-center justify-between border-b border-border py-2">
        <span className="text-xs font-medium text-muted-foreground">Conversación</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={newConversation}
          disabled={messages.length === 0}
        >
          <RotateCcw className="size-3.5" />
          Nueva conversación
        </Button>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="Pregúntale al asistente de ReadHub"
            description="Responde con base en el conocimiento publicado en la plataforma. Probá con una pregunta sobre los artículos disponibles."
            action={
              suggestions.length > 0 ? (
                <div className="flex flex-wrap justify-center gap-2">
                  {suggestions.map((suggestion) => (
                    <Button
                      key={suggestion}
                      variant="outline"
                      size="sm"
                      onClick={() => sendMessage(suggestion)}
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              ) : undefined
            }
          />
        ) : (
          <div className="flex flex-col gap-4 py-2" role="log" aria-live="polite">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            {isRetrieving && (
              <p className="text-sm text-muted-foreground" role="status">
                Buscando en los artículos publicados…
              </p>
            )}
            <div ref={scrollAnchorRef} />
          </div>
        )}
      </CardContent>

      <CardFooter className="flex-col items-stretch gap-2 bg-transparent p-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
            <AlertAction>
              <Button variant="outline" size="sm" onClick={retryLastMessage}>
                Reintentar
              </Button>
            </AlertAction>
          </Alert>
        )}
        <ChatInput
          onSend={sendMessage}
          isStreaming={isLoading}
          onStop={stopGeneration}
          disabled={isLoading}
        />
      </CardFooter>
    </Card>
  )
}

export { ChatWindow }
