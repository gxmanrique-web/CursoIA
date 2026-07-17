import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@readhub/types"
import { withObservability } from "@readhub/shared/observability"

import { searchArticleChunks, type SemanticSearchOptions, type SemanticSearchResult } from "./vector-search.service"
import { buildContext, type ContextBuilderOptions, type ContextSource } from "./context-builder.service"
import { NO_CONTEXT_ANSWER } from "./prompts"
import {
  generateCompletion as callGroqCompletion,
  streamCompletion as streamGroqCompletion,
  type ChatMessage,
  type CompletionUsage,
} from "./providers/groq"

const SERVICE = "chat.service"
const MAX_RESPONSE_TOKENS = 1024

export interface AskAssistantOptions {
  search?: SemanticSearchOptions
  context?: ContextBuilderOptions
}

export interface AssistantMetadata {
  llmInvoked: boolean
  documentsUsed: number
  totalTokens: number | null
}

export interface AskAssistantResult {
  answer: string
  sources: ContextSource[]
  metadata: AssistantMetadata
}

/**
 * Responde a partir de fragmentos YA recuperados, sin volver a buscar.
 * Permite verificar el cortocircuito anti-alucinación sin depender de
 * ningún proveedor (ni Voyage para buscar, ni Groq para responder).
 */
async function _answerFromResults(
  query: string,
  results: SemanticSearchResult[],
  options: ContextBuilderOptions = {}
): Promise<AskAssistantResult> {
  const context = buildContext(query, results, options)

  // Cortocircuito anti-alucinación: sin contexto relevante, NO se invoca al
  // modelo. Pedirle en el prompt que diga "no sé" no basta — un modelo sin
  // contexto normalmente inventa, y obedece la instrucción de forma
  // esporádica, lo que es peor que nunca porque el fallo es intermitente.
  if (!context.hasContext) {
    return {
      answer: NO_CONTEXT_ANSWER,
      sources: [],
      metadata: { llmInvoked: false, documentsUsed: 0, totalTokens: null },
    }
  }

  const messages: ChatMessage[] = [
    { role: "system", content: context.systemPrompt },
    { role: "user", content: context.userPrompt },
  ]

  const completion = await callGroqCompletion(messages, MAX_RESPONSE_TOKENS)

  return {
    answer: completion.content,
    sources: context.sources,
    metadata: {
      llmInvoked: true,
      documentsUsed: context.sources.length,
      totalTokens: completion.usage?.totalTokens ?? null,
    },
  }
}

/**
 * Único punto de entrada del asistente conversacional. No genera embeddings
 * ni construye contexto por su cuenta: coordina, en orden, vector-search
 * (recuperación) -> context-builder (construcción del prompt) -> el cortocircuito
 * o el LLM, reutilizando _answerFromResults.
 */
async function _askAssistant(
  supabase: SupabaseClient<Database>,
  query: string,
  options: AskAssistantOptions = {}
): Promise<AskAssistantResult> {
  const results = await searchArticleChunks(supabase, query, options.search)
  return _answerFromResults(query, results, options.context)
}

export type AssistantStreamEvent =
  | { type: "sources"; sources: ContextSource[] }
  | { type: "delta"; content: string }
  | { type: "done"; metadata: AssistantMetadata }

/**
 * Misma orquestación que askAssistant, en streaming: emite las fuentes en
 * cuanto el contexto está construido (antes de que exista ningún texto),
 * luego los fragmentos de texto a medida que llegan de Groq, y por último
 * los metadatos. El Route Handler (Prompt 8) solo traduce estos eventos a
 * líneas NDJSON, no decide nada del pipeline.
 */
async function* _streamAssistant(
  supabase: SupabaseClient<Database>,
  query: string,
  options: AskAssistantOptions = {}
): AsyncGenerator<AssistantStreamEvent> {
  const results = await searchArticleChunks(supabase, query, options.search)
  const context = buildContext(query, results, options.context)

  yield { type: "sources", sources: context.sources }

  if (!context.hasContext) {
    yield { type: "delta", content: NO_CONTEXT_ANSWER }
    yield { type: "done", metadata: { llmInvoked: false, documentsUsed: 0, totalTokens: null } }
    return
  }

  const messages: ChatMessage[] = [
    { role: "system", content: context.systemPrompt },
    { role: "user", content: context.userPrompt },
  ]

  let usage: CompletionUsage | null = null
  for await (const event of streamGroqCompletion(messages, MAX_RESPONSE_TOKENS)) {
    if (event.type === "delta") {
      yield { type: "delta", content: event.content }
    } else {
      usage = event.usage
    }
  }

  yield {
    type: "done",
    metadata: {
      llmInvoked: true,
      documentsUsed: context.sources.length,
      totalTokens: usage?.totalTokens ?? null,
    },
  }
}

export interface CompletionOptions {
  maxTokens?: number
}

export interface SimpleCompletionResult {
  text: string
  usage: CompletionUsage | null
}

/**
 * Envía un prompt de una sola vez al LLM configurado (Groq), sin pasar por
 * búsqueda ni construcción de contexto. Para las Tools de análisis avanzado
 * (analysis.service) que arman sus propios prompts sobre artículos
 * explícitos en vez de resolver una consulta por RAG.
 */
async function _generateCompletion(
  prompt: string,
  options: CompletionOptions = {}
): Promise<SimpleCompletionResult> {
  const result = await callGroqCompletion(
    [{ role: "user", content: prompt }],
    options.maxTokens ?? MAX_RESPONSE_TOKENS
  )
  return { text: result.content, usage: result.usage }
}

export const answerFromResults = withObservability(SERVICE, "answerFromResults", _answerFromResults)
export const askAssistant = withObservability(SERVICE, "askAssistant", _askAssistant)
export const streamAssistant = _streamAssistant
export const generateCompletion = withObservability(SERVICE, "generateCompletion", _generateCompletion)
