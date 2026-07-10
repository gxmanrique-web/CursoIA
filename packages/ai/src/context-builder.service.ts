import { getArticleDocumentText } from "./embedding.service"
import type { SemanticSearchResult } from "./vector-search.service"
import { withObservability } from "@readhub/shared/observability"

const SERVICE = "context-builder.service"

// Cuántos documentos, como máximo, entran al contexto final. Deliberadamente
// menor que el Top-K por defecto de vector-search.service (5): deja margen
// para descartar aquí los más débiles/redundantes sin perder diversidad de
// fuentes, y mantiene el contexto manejable para el LLM.
const DEFAULT_MAX_DOCUMENTS = 4

// Tope de caracteres del contenido de UN solo documento dentro del contexto.
// Evita que un artículo muy largo consuma todo el presupuesto total él solo.
const DEFAULT_MAX_CHARACTERS_PER_DOCUMENT = 4000

// Presupuesto total de caracteres para el contenido de todas las fuentes
// combinadas (~3000 tokens aproximados). Configurable: un cambio de modelo
// de Claude con otra ventana de contexto solo requiere ajustar este valor.
const DEFAULT_MAX_CONTEXT_CHARACTERS = 12000

const SYSTEM_INSTRUCTIONS =
  "Eres el asistente de ReadHub. Responde ÚNICAMENTE utilizando la información " +
  "contenida en las FUENTES listadas a continuación. Si las fuentes no contienen " +
  "información suficiente para responder la consulta, indica explícitamente que no " +
  "dispones de esa información en ReadHub — no inventes ni completes con conocimiento " +
  "externo. Cuando uses una fuente, cítala por su número entre corchetes, p. ej. [Fuente 2]."

export interface ContextBuilderOptions {
  maxDocuments?: number
  maxCharactersPerDocument?: number
  maxContextCharacters?: number
}

export interface ContextBuilderInput {
  query: string
  documents: SemanticSearchResult[]
}

export interface ContextSource {
  rank: number
  articleId: string
  title: string
  similarity: number
}

export interface ContextBuildResult {
  prompt: string
  sources: ContextSource[]
  documentsUsed: number
  totalContextCharacters: number
}

interface CandidateDocument {
  result: SemanticSearchResult
  content: string
}

/**
 * Resuelve el texto de cada documento recuperado (contenido completo si el
 * documento es .txt, o el resumen como fallback — misma limitación conocida
 * que embedding.service para PDF/DOCX) y descarta los que no tienen ningún
 * contenido aprovechable ("calidad del contenido").
 */
async function resolveCandidateContent(
  documents: SemanticSearchResult[]
): Promise<CandidateDocument[]> {
  const candidates = await Promise.all(
    documents.map(async (result) => {
      const documentText = result.documentPath
        ? await getArticleDocumentText(result.documentPath)
        : null
      const content = (documentText ?? result.summary ?? "").trim()
      return { result, content }
    })
  )

  return candidates.filter((candidate) => candidate.content.length > 0)
}

/**
 * Elimina documentos cuyo contenido (normalizado) es idéntico al de un
 * documento ya seleccionado. Heurística simple y barata: suficiente para
 * evitar el caso más común de redundancia (mismo artículo indexado dos
 * veces, o dos artículos con el mismo resumen usado como fallback) sin
 * requerir una comparación semántica adicional en esta fase.
 */
function deduplicate(candidates: CandidateDocument[]): CandidateDocument[] {
  const seen = new Set<string>()
  const unique: CandidateDocument[] = []

  for (const candidate of candidates) {
    const normalized = candidate.content.toLowerCase().trim()
    if (seen.has(normalized)) continue
    seen.add(normalized)
    unique.push(candidate)
  }

  return unique
}

/**
 * Selecciona qué documentos entran al contexto final, en orden de
 * relevancia (los candidatos ya llegan ordenados por rank desde
 * vector-search.service). Se incluyen greedily hasta agotar
 * maxDocuments o maxContextCharacters, lo que ocurra primero; el
 * contenido de cada documento se trunca a maxCharactersPerDocument.
 */
function selectDocuments(
  candidates: CandidateDocument[],
  options: Required<ContextBuilderOptions>
): CandidateDocument[] {
  const selected: CandidateDocument[] = []
  let totalCharacters = 0

  for (const candidate of candidates) {
    if (selected.length >= options.maxDocuments) break

    const truncatedContent = candidate.content.slice(0, options.maxCharactersPerDocument)
    if (totalCharacters + truncatedContent.length > options.maxContextCharacters) {
      if (selected.length === 0) {
        // Ni el primer documento (el más relevante) cabe entero: se incluye
        // truncado al espacio restante, para no devolver un contexto vacío.
        const remaining = options.maxContextCharacters - totalCharacters
        if (remaining > 0) {
          selected.push({ result: candidate.result, content: truncatedContent.slice(0, remaining) })
        }
      }
      break
    }

    selected.push({ result: candidate.result, content: truncatedContent })
    totalCharacters += truncatedContent.length
  }

  return selected
}

/**
 * Construye el bloque de FUENTES del prompt. Cada documento queda separado
 * explícitamente y etiquetado con su número de fuente, título y similitud,
 * para que el modelo pueda citar el origen exacto de cada afirmación.
 */
function formatSourcesBlock(selected: CandidateDocument[]): string {
  return selected
    .map((candidate, index) => {
      const { result, content } = candidate
      return (
        `[Fuente ${index + 1}] "${result.title}" (similitud: ${result.similarity.toFixed(2)})\n` +
        `${content}`
      )
    })
    .join("\n\n---\n\n")
}

function buildPrompt(query: string, sourcesBlock: string): string {
  return (
    `${SYSTEM_INSTRUCTIONS}\n\n` +
    `CONSULTA DEL USUARIO:\n${query}\n\n` +
    `FUENTES DISPONIBLES:\n\n${sourcesBlock}`
  )
}

/**
 * Transforma la consulta del usuario y los documentos recuperados
 * (vector-search.service) en un prompt estructurado listo para enviarse a
 * Claude en una fase posterior (Prompt 8). No realiza búsquedas ni llama a
 * ningún proveedor de IA: solo compone texto a partir de lo que recibe.
 */
async function _buildContext(
  input: ContextBuilderInput,
  options: ContextBuilderOptions = {}
): Promise<ContextBuildResult> {
  const resolvedOptions: Required<ContextBuilderOptions> = {
    maxDocuments: options.maxDocuments ?? DEFAULT_MAX_DOCUMENTS,
    maxCharactersPerDocument:
      options.maxCharactersPerDocument ?? DEFAULT_MAX_CHARACTERS_PER_DOCUMENT,
    maxContextCharacters: options.maxContextCharacters ?? DEFAULT_MAX_CONTEXT_CHARACTERS,
  }

  const candidates = await resolveCandidateContent(input.documents)
  const deduplicated = deduplicate(candidates)
  const selected = selectDocuments(deduplicated, resolvedOptions)

  const sourcesBlock = selected.length > 0 ? formatSourcesBlock(selected) : "(sin fuentes relevantes)"
  const prompt = buildPrompt(input.query, sourcesBlock)

  const sources: ContextSource[] = selected.map(({ result }) => ({
    rank: result.rank,
    articleId: result.articleId,
    title: result.title,
    similarity: result.similarity,
  }))

  return {
    prompt,
    sources,
    documentsUsed: selected.length,
    totalContextCharacters: selected.reduce((sum, { content }) => sum + content.length, 0),
  }
}

export const buildContext = withObservability(SERVICE, "buildContext", _buildContext)
