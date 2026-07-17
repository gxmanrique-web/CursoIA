import { describe, expect, it } from "vitest"

import { buildContext } from "./context-builder.service"
import { NO_CONTEXT_ANSWER } from "./prompts"
import type { SemanticSearchResult } from "./vector-search.service"

function makeResult(overrides: Partial<SemanticSearchResult> = {}): SemanticSearchResult {
  return {
    rank: 1,
    chunkId: "chunk-1",
    articleId: "article-1",
    chunkIndex: 0,
    content: "Contenido de prueba",
    title: "Título de prueba",
    summary: "Resumen de prueba",
    similarity: 0.75,
    ...overrides,
  }
}

describe("buildContext", () => {
  it("es pura: llamarla dos veces con la misma entrada da el mismo resultado", () => {
    const results = [makeResult()]
    const first = buildContext("¿qué es X?", results)
    const second = buildContext("¿qué es X?", results)

    expect(first).toEqual(second)
  })

  it("usa el contenido del fragmento tal cual, sin resolver nada por I/O", () => {
    const result = buildContext("¿qué es X?", [makeResult({ content: "Contenido del fragmento." })])

    expect(result.hasContext).toBe(true)
    expect(result.sources).toEqual([
      {
        rank: 1,
        citationNumber: 1,
        chunkId: "chunk-1",
        articleId: "article-1",
        title: "Título de prueba",
        similarity: 0.75,
      },
    ])
    expect(result.userPrompt).toContain("Contenido del fragmento.")
    expect(result.userPrompt).toContain("¿qué es X?")
  })

  it("descarta resultados por debajo del umbral de similitud", () => {
    const result = buildContext("q", [makeResult({ similarity: 0.1 })], { similarityThreshold: 0.5 })

    expect(result.hasContext).toBe(false)
    expect(result.sources).toEqual([])
  })

  it("cortocircuita a la frase canónica cuando no hay documentos (caso límite)", () => {
    const result = buildContext("q", [])

    expect(result.hasContext).toBe(false)
    expect(result.sources).toEqual([])
    expect(result.userPrompt).toContain(NO_CONTEXT_ANSWER)
  })

  it("respeta maxDocuments y descarta el resto en orden de relevancia", () => {
    const results = [
      makeResult({ articleId: "a1", chunkId: "c1", rank: 1 }),
      makeResult({ articleId: "a2", chunkId: "c2", rank: 2 }),
      makeResult({ articleId: "a3", chunkId: "c3", rank: 3 }),
    ]

    const result = buildContext("q", results, { maxDocuments: 2 })

    expect(result.sources.map((s) => s.articleId)).toEqual(["a1", "a2"])
  })

  it("trunca el contenido de un fragmento a maxCharactersPerDocument", () => {
    const result = buildContext("q", [makeResult({ content: "x".repeat(100) })], {
      maxCharactersPerDocument: 10,
    })

    expect(result.userPrompt).toContain("x".repeat(10))
    expect(result.userPrompt).not.toContain("x".repeat(11))
  })

  it("detiene la selección al superar maxContextCharacters, sin dejarlo vacío", () => {
    const results = [
      makeResult({ articleId: "a1", chunkId: "c1", rank: 1, content: "a".repeat(20) }),
      makeResult({ articleId: "a2", chunkId: "c2", rank: 2, content: "b".repeat(20) }),
    ]

    const result = buildContext("q", results, { maxContextCharacters: 25, maxCharactersPerDocument: 100 })

    // Solo el primer fragmento cabe (20 <= 25); el segundo lo excede y se descarta.
    expect(result.sources.map((s) => s.articleId)).toEqual(["a1"])
  })

  it("incluye el primer fragmento truncado al espacio restante si ni ese cabe entero (caso límite)", () => {
    const result = buildContext("q", [makeResult({ content: "z".repeat(50) })], {
      maxContextCharacters: 10,
      maxCharactersPerDocument: 100,
    })

    expect(result.sources).toHaveLength(1)
    expect(result.userPrompt).toContain("z".repeat(10))
    expect(result.userPrompt).not.toContain("z".repeat(11))
  })

  it("numera las citas [n] en el orden final seleccionado, no en el rank original", () => {
    const results = [
      makeResult({ articleId: "a1", chunkId: "c1", rank: 3 }),
      makeResult({ articleId: "a2", chunkId: "c2", rank: 5 }),
    ]

    const result = buildContext("q", results)

    expect(result.sources[0].citationNumber).toBe(1)
    expect(result.sources[1].citationNumber).toBe(2)
    expect(result.userPrompt).toContain('numero="1"')
    expect(result.userPrompt).toContain('numero="2"')
  })
})
