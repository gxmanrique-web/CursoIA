// Único módulo del proyecto que conoce a Groq. Groq expone una API
// compatible con la de OpenAI, así que se reutiliza el SDK de openai
// apuntando a su baseURL — nadie más importa este SDK ni esta URL.
import OpenAI from "openai"

const GROQ_BASE_URL = "https://api.groq.com/openai/v1"
const DEFAULT_MODEL = "llama-3.3-70b-versatile"

function getModel(): string {
  return process.env.GROQ_MODEL || DEFAULT_MODEL
}

function getApiKey(): string {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    throw new Error("GROQ_API_KEY no está configurada. providers/groq la requiere para generar texto.")
  }
  return apiKey
}

let groqClient: OpenAI | null = null

function getClient(): OpenAI {
  if (!groqClient) {
    groqClient = new OpenAI({ apiKey: getApiKey(), baseURL: GROQ_BASE_URL })
  }
  return groqClient
}

// Contrato agnóstico del proveedor: quien llama a estas funciones no conoce
// el SDK, el modelo ni la URL. Cambiar de proveedor (como ya está probado
// con Claude en chat.service.ts) implica reescribir solo este archivo.
export interface ChatMessage {
  role: "system" | "user" | "assistant"
  content: string
}

export interface CompletionUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

export interface CompletionResult {
  content: string
  usage: CompletionUsage | null
}

function toUsage(usage: OpenAI.CompletionUsage | undefined | null): CompletionUsage | null {
  if (!usage) return null
  return {
    promptTokens: usage.prompt_tokens,
    completionTokens: usage.completion_tokens,
    totalTokens: usage.total_tokens,
  }
}

export async function generateCompletion(
  messages: ChatMessage[],
  maxTokens?: number
): Promise<CompletionResult> {
  const response = await getClient().chat.completions.create({
    model: getModel(),
    messages,
    max_tokens: maxTokens,
  })

  return {
    content: response.choices[0]?.message?.content ?? "",
    usage: toUsage(response.usage),
  }
}

export type CompletionStreamEvent =
  | { type: "delta"; content: string }
  | { type: "usage"; usage: CompletionUsage }

/**
 * Streaming con el uso de tokens pedido explícitamente
 * (stream_options.include_usage): Groq lo entrega en un último fragmento
 * con `choices` vacío, después de todos los deltas de texto, no en su
 * lugar.
 */
export async function* streamCompletion(
  messages: ChatMessage[],
  maxTokens?: number
): AsyncGenerator<CompletionStreamEvent> {
  const stream = await getClient().chat.completions.create({
    model: getModel(),
    messages,
    max_tokens: maxTokens,
    stream: true,
    stream_options: { include_usage: true },
  })

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content
    if (delta) {
      yield { type: "delta", content: delta }
    }

    const usage = toUsage(chunk.usage)
    if (usage) {
      yield { type: "usage", usage }
    }
  }
}
