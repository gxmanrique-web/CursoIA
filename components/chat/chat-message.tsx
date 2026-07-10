import { Bot, User } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import type { ChatMessage as ChatMessageType } from "@/hooks/useChat"
import { ChatSources } from "@/components/chat/chat-sources"

interface ChatMessageProps {
  message: ChatMessageType
}

function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user"

  return (
    <div className={cn("flex items-start gap-3", isUser && "flex-row-reverse")}>
      <Avatar size="sm" className="mt-0.5">
        <AvatarFallback>
          {isUser ? <User className="size-3.5" /> : <Bot className="size-3.5" />}
        </AvatarFallback>
      </Avatar>

      <div
        className={cn(
          "max-w-[80%] rounded-xl px-3 py-2 text-sm",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
        )}
      >
        <p className="whitespace-pre-wrap wrap-break-word">
          {message.content}
          {message.isStreaming && (
            <span
              className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-current align-middle"
              aria-hidden="true"
            />
          )}
        </p>

        {!isUser && !message.isStreaming && message.sources && (
          <ChatSources sources={message.sources} />
        )}
      </div>
    </div>
  )
}

export { ChatMessage }
