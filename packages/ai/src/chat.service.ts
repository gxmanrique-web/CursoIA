import Anthropic from "@anthropic-ai/sdk"

import { withObservability } from "@readhub/shared/observability"
import { searchArticles, type SemanticSearchOptions } from "./vector-search.service"
import {
  buildContext,
  type ContextBuilderOptions,
  type ContextSource,
} from "./context-builder.service"

const SERVICE = "chat.service"

// Balance calidad/costo/latencia adecuado para un asistente conversacional
// de RAG. La integración con Claude queda completamente encapsulada en este
// archivo: ningún otro módulo importa el SDK de Anthropic, así que cambiar
// de modelo -o de proveedor- es un cambio local sin impacto en el resto de
// la aplicación.
const CHAT_MODEL = "claude-sonnet-5"
const MAX_RESPONSE_TOKENS = 1024

let anthropicClient: Anthropic | null = null

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error(
        "ANTHROPIC_API_KEY no está configurada. chat.service la requiere para generar respuestas."
      )
    }
    anthropicClient = new Anthropic({ apiKey })
  }
  return anthropicClient
}

export interface ChatOptions {
  search?: SemanticSearchOptions
  context?: ContextBuilderOptions
}

export interface ChatUsage {
  inputTokens: number
  outputTokens: number
}

export interface ChatMetadata {
  model: string
  documentsRetrieved: number
  documentsUsed: number
  usage?: ChatUsage
}

export interface ChatResult {
  answer: string
  sources: ContextSource[]
  metadata: ChatMetadata
}

/**
 * Único punto de entrada del asistente inteligente. No genera embeddings ni
 * ejecuta búsquedas por su cuenta: coordina, en orden, vector-search.service
 * (recuperación) y context-builder.service (construcción del prompt), y
 * solo entonces invoca a Claude con el prompt ya construido. El
 * comportamiento de "responder solo con las fuentes / admitir cuando no hay
 * información suficiente" está reforzado en las instrucciones de sistema
 * que arma context-builder.service (Prompt 7), no aquí — este servicio no
 * decide nada sobre el contenido de la respuesta, solo orquesta.
 */
async function _askAssistant(query: string, options: ChatOptions = {}): Promise<ChatResult> {
  const searchResults = await searchArticles(query, options.search)
  const context = await buildContext({ query, documents: searchResults }, options.context)

  const client = getAnthropicClient()
  const response = await client.messages.create({
    model: CHAT_MODEL,
    max_tokens: MAX_RESPONSE_TOKENS,
    messages: [{ role: "user", content: context.prompt }],
  })

  const answer = response.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("\n")
    .trim()

  return {
    answer,
    sources: context.sources,
    metadata: {
      model: CHAT_MODEL,
      documentsRetrieved: searchResults.length,
      documentsUsed: context.documentsUsed,
      usage: response.usage
        ? {
            inputTokens: response.usage.input_tokens,
            outputTokens: response.usage.output_tokens,
          }
        : undefined,
    },
  }
}

export const askAssistant = withObservability(SERVICE, "askAssistant", _askAssistant)
