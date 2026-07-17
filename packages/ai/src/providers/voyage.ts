// Único módulo del proyecto que conoce la API de Voyage. Nadie más importa
// esta URL ni construye esta petición: el resto de packages/ai solo llama a
// las funciones exportadas de aquí.

const VOYAGE_API_URL = "https://api.voyageai.com/v1/embeddings"
const VOYAGE_MODEL = "voyage-4"

// Debe coincidir exactamente con vector(1024) en la migración
// create_article_chunks. Cambiar de modelo con otra dimensión de salida
// requiere además una migración de columna.
export const VOYAGE_EMBEDDING_DIMENSIONS = 1024

// Límite de Voyage por petición de embeddings.
const MAX_BATCH_SIZE = 96

function getApiKey(): string {
  const apiKey = process.env.VOYAGE_API_KEY
  if (!apiKey) {
    throw new Error(
      "VOYAGE_API_KEY no está configurada. providers/voyage la requiere para generar embeddings."
    )
  }
  return apiKey
}

// Voyage proyecta consultas y documentos de forma distinta; usar el mismo
// input_type para ambos no da error, solo degrada la recuperación en
// silencio.
export type VoyageInputType = "query" | "document"

interface VoyageEmbeddingItem {
  embedding: number[]
  index: number
}

interface VoyageEmbeddingResponse {
  data: VoyageEmbeddingItem[]
}

function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size))
  }
  return batches
}

function validateVector(vector: unknown): number[] {
  if (!Array.isArray(vector)) {
    throw new Error("Voyage devolvió un embedding que no es un array.")
  }
  if (vector.length !== VOYAGE_EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Voyage devolvió un embedding de ${vector.length} dimensiones, se esperaban ${VOYAGE_EMBEDDING_DIMENSIONS}.`
    )
  }
  if (!vector.every((value) => typeof value === "number" && Number.isFinite(value))) {
    throw new Error("Voyage devolvió un embedding con valores no numéricos o no finitos.")
  }
  return vector as number[]
}

async function embedBatch(texts: string[], inputType: VoyageInputType): Promise<number[][]> {
  const response = await fetch(VOYAGE_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: texts,
      model: VOYAGE_MODEL,
      input_type: inputType,
      output_dimension: VOYAGE_EMBEDDING_DIMENSIONS,
    }),
  })

  if (!response.ok) {
    // No se expone el cuerpo crudo del proveedor: podría filtrar detalles
    // internos (mensajes de error de Voyage, límites de cuenta, etc.).
    throw new Error(`Voyage respondió con error (status ${response.status}).`)
  }

  const payload = (await response.json()) as VoyageEmbeddingResponse

  // Voyage NO garantiza el orden de entrada en su respuesta: hay que
  // reordenar por el campo `index` que devuelve cada item, o se asocia el
  // vector de un fragmento al fragmento equivocado.
  return payload.data
    .slice()
    .sort((a, b) => a.index - b.index)
    .map((item) => validateVector(item.embedding))
}

/**
 * Genera embeddings para una lista de textos, preservando el orden de
 * entrada. Trocea en lotes de como máximo MAX_BATCH_SIZE textos por
 * petición.
 */
export async function generateEmbeddings(
  texts: string[],
  inputType: VoyageInputType
): Promise<number[][]> {
  if (texts.length === 0) return []

  const results: number[][] = []
  for (const batch of chunk(texts, MAX_BATCH_SIZE)) {
    results.push(...(await embedBatch(batch, inputType)))
  }
  return results
}

/** Serializa un vector al literal que espera pgvector: "[0.1,0.2,...]". */
export function toPgVectorLiteral(vector: number[]): string {
  return `[${vector.join(",")}]`
}
