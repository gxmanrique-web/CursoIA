"use client"

import { useEffect, useRef } from "react"
import { Sparkles } from "lucide-react"

import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Alert, AlertDescription, AlertAction } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/states/empty-state"
import { ChatMessage } from "@/components/chat/chat-message"
import { ChatInput } from "@/components/chat/chat-input"
import { useChat } from "@/hooks/useChat"

function ChatWindow() {
  const { messages, isLoading, error, sendMessage, retryLastMessage } = useChat()
  const scrollAnchorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  return (
    <Card className="flex h-[70vh] flex-col">
      <CardContent className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="Pregúntale al asistente de ReadHub"
            description="Responde con base en el conocimiento publicado en la plataforma. Probá con una pregunta sobre los artículos disponibles."
          />
        ) : (
          <div className="flex flex-col gap-4 py-2">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            {isLoading && (
              <p className="text-sm text-muted-foreground" role="status">
                El asistente está pensando…
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
        <ChatInput onSend={sendMessage} disabled={isLoading} />
      </CardFooter>
    </Card>
  )
}

export { ChatWindow }
