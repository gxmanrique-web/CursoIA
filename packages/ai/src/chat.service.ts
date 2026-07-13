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

export interface CompletionOptions {
  maxTokens?: number
}

export interface CompletionResult {
  text: string
  model: string
  usage?: ChatUsage
}

/**
 * Único punto de contacto con el SDK de Anthropic del proyecto: envía un
 * prompt ya construido y devuelve el texto de la respuesta. Extraído de
 * `_askAssistant` (Prompt 7) para que las Tools de análisis avanzado
 * (`analysis.service`, que arman sus propios prompts de comparación/
 * resumen/temas sobre artículos explícitos, sin pasar por búsqueda
 * semántica) puedan invocar a Claude sin duplicar la instanciación del
 * cliente ni el parseo de la respuesta.
 */
async function _generateCompletion(
  prompt: string,
  options: CompletionOptions = {}
): Promise<CompletionResult> {
  const client = getAnthropicClient()
  const response = await client.messages.create({
    model: CHAT_MODEL,
    max_tokens: options.maxTokens ?? MAX_RESPONSE_TOKENS,
    messages: [{ role: "user", content: prompt }],
  })

  const text = response.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("\n")
    .trim()

  return {
    text,
    model: CHAT_MODEL,
    usage: response.usage
      ? {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        }
      : undefined,
  }
}

/**
 * Único punto de entrada del asistente inteligente. No genera embeddings ni
 * ejecuta búsquedas por su cuenta: coordina, en orden, vector-search.service
 * (recuperación) y context-builder.service (construcción del prompt), y
 * solo entonces invoca a Claude (vía `generateCompletion`) con el prompt ya
 * construido. El comportamiento de "responder solo con las fuentes / admitir
 * cuando no hay información suficiente" está reforzado en las instrucciones
 * de sistema que arma context-builder.service (Prompt 7), no aquí — este
 * servicio no decide nada sobre el contenido de la respuesta, solo orquesta.
 */
async function _askAssistant(query: string, options: ChatOptions = {}): Promise<ChatResult> {
  const searchResults = await searchArticles(query, options.search)
  const context = await buildContext({ query, documents: searchResults }, options.context)
  const completion = await _generateCompletion(context.prompt)

  return {
    answer: completion.text,
    sources: context.sources,
    metadata: {
      model: completion.model,
      documentsRetrieved: searchResults.length,
      documentsUsed: context.documentsUsed,
      usage: completion.usage,
    },
  }
}

export const askAssistant = withObservability(SERVICE, "askAssistant", _askAssistant)
export const generateCompletion = withObservability(SERVICE, "generateCompletion", _generateCompletion)
