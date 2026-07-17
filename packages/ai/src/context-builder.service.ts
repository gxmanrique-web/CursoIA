import { buildUserPrompt, SYSTEM_PROMPT, type PromptDocument } from "./prompts"
import { DEFAULT_SIMILARITY_THRESHOLD, type SemanticSearchResult } from "./vector-search.service"

// Cuántos fragmentos, como máximo, entran al contexto final.
const DEFAULT_MAX_DOCUMENTS = 4

// Tope de caracteres del contenido de UN solo fragmento dentro del contexto.
// Ya acotado en origen por el tamaño objetivo de fragmentación
// (~1200 caracteres, embedding.service), este límite es una defensa
// adicional por si algún fragmento llega más largo de lo esperado.
const DEFAULT_MAX_CHARACTERS_PER_DOCUMENT = 4000

// Presupuesto total de caracteres para el contenido de todas las fuentes
// combinadas.
const DEFAULT_MAX_CONTEXT_CHARACTERS = 12000

export interface ContextBuilderOptions {
  maxDocuments?: number
  maxCharactersPerDocument?: number
  maxContextCharacters?: number
  similarityThreshold?: number
}

export interface ContextSource {
  rank: number
  citationNumber: number
  chunkId: string
  articleId: string
  title: string
  similarity: number
}

export interface ContextBuildResult {
  systemPrompt: string
  userPrompt: string
  sources: ContextSource[]
  hasContext: boolean
}

/**
 * Selecciona qué resultados entran al contexto final, en el orden de
 * relevancia en que ya llegan (vector-search.service, que a su vez respeta
 * el orden que produjo el índice HNSW — aquí no se reordena). Se incluyen
 * greedily hasta agotar maxDocuments o maxContextCharacters, lo que ocurra
 * primero, descartando además cualquier resultado por debajo del umbral de
 * similitud (defensa adicional: en el flujo normal ya llegan filtrados
 * desde SQL, pero esta función es pura y no puede asumirlo).
 */
function selectResults(
  results: SemanticSearchResult[],
  options: Required<ContextBuilderOptions>
): SemanticSearchResult[] {
  const selected: SemanticSearchResult[] = []
  let totalCharacters = 0

  for (const result of results) {
    if (selected.length >= options.maxDocuments) break
    if (result.similarity < options.similarityThreshold) continue

    const truncatedContent = result.content.slice(0, options.maxCharactersPerDocument)
    if (totalCharacters + truncatedContent.length > options.maxContextCharacters) {
      if (selected.length === 0) {
        // Ni el primer fragmento (el más relevante) cabe entero: se incluye
        // truncado al espacio restante, para no devolver un contexto vacío.
        const remaining = options.maxContextCharacters - totalCharacters
        if (remaining > 0) {
          selected.push({ ...result, content: truncatedContent.slice(0, remaining) })
        }
      }
      break
    }

    selected.push({ ...result, content: truncatedContent })
    totalCharacters += truncatedContent.length
  }

  return selected
}

/**
 * Transforma la consulta del usuario y los fragmentos ya recuperados
 * (vector-search.service) en el prompt de sistema y de usuario listos para
 * el LLM, y en la lista de fuentes citables. Función PURA: sin llamadas a
 * Supabase, sin red, sin fechas ni aleatoriedad — el contenido de cada
 * fragmento ya viene resuelto en el resultado de búsqueda (article_chunks
 * guarda el texto directamente), así que no hace falta ninguna resolución
 * adicional de I/O como en la versión anterior de este service.
 */
export function buildContext(
  query: string,
  results: SemanticSearchResult[],
  options: ContextBuilderOptions = {}
): ContextBuildResult {
  const resolvedOptions: Required<ContextBuilderOptions> = {
    maxDocuments: options.maxDocuments ?? DEFAULT_MAX_DOCUMENTS,
    maxCharactersPerDocument: options.maxCharactersPerDocument ?? DEFAULT_MAX_CHARACTERS_PER_DOCUMENT,
    maxContextCharacters: options.maxContextCharacters ?? DEFAULT_MAX_CONTEXT_CHARACTERS,
    similarityThreshold: options.similarityThreshold ?? DEFAULT_SIMILARITY_THRESHOLD,
  }

  const selected = selectResults(results, resolvedOptions)

  const documents: PromptDocument[] = selected.map((result, index) => ({
    citationNumber: index + 1,
    title: result.title,
    articleId: result.articleId,
    similarity: result.similarity,
    content: result.content,
  }))

  const sources: ContextSource[] = selected.map((result, index) => ({
    rank: result.rank,
    citationNumber: index + 1,
    chunkId: result.chunkId,
    articleId: result.articleId,
    title: result.title,
    similarity: result.similarity,
  }))

  return {
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: buildUserPrompt(query, documents),
    sources,
    hasContext: selected.length > 0,
  }
}
