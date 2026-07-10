import { ChatWindow } from "@/components/chat/chat-window"

export default function AssistantPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div>
        <h1 className="font-heading text-xl font-semibold text-foreground">Asistente</h1>
        <p className="text-sm text-muted-foreground">
          Consultá el conocimiento publicado en ReadHub en lenguaje natural.
        </p>
      </div>
      <ChatWindow />
    </div>
  )
}
