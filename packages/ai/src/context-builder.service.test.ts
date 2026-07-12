import { beforeEach, describe, expect, it, vi } from "vitest"

const { getArticleDocumentTextMock } = vi.hoisted(() => ({
  getArticleDocumentTextMock: vi.fn(),
}))

vi.mock("./embedding.service", () => ({
  getArticleDocumentText: getArticleDocumentTextMock,
}))

import { buildContext } from "./context-builder.service"
import type { SemanticSearchResult } from "./vector-search.service"

function makeResult(overrides: Partial<SemanticSearchResult> = {}): SemanticSearchResult {
  return {
    rank: 1,
    articleId: "article-1",
    title: "Título de prueba",
    summary: "Resumen de prueba",
    documentPath: "author/article-1/doc.txt",
    similarity: 0.75,
    ...overrides,
  }
}

describe("buildContext", () => {
  beforeEach(() => {
    getArticleDocumentTextMock.mockReset()
  })

  it("usa el contenido del documento cuando está disponible", async () => {
    getArticleDocumentTextMock.mockResolvedValue("Contenido completo del artículo.")
    const result = await buildContext({ query: "¿qué es X?", documents: [makeResult()] })

    expect(result.documentsUsed).toBe(1)
    expect(result.sources).toEqual([
      { rank: 1, articleId: "article-1", title: "Título de prueba", similarity: 0.75 },
    ])
    expect(result.prompt).toContain("Contenido completo del artículo.")
    expect(result.prompt).toContain("¿qué es X?")
  })

  it("usa el resumen como fallback si el documento no tiene texto extraíble", async () => {
    getArticleDocumentTextMock.mockResolvedValue(null)
    const result = await buildContext({
      query: "q",
      documents: [makeResult({ summary: "Solo hay resumen" })],
    })

    expect(result.documentsUsed).toBe(1)
    expect(result.prompt).toContain("Solo hay resumen")
  })

  it("descarta documentos sin contenido ni resumen aprovechable", async () => {
    getArticleDocumentTextMock.mockResolvedValue(null)
    const result = await buildContext({
      query: "q",
      documents: [makeResult({ summary: null, documentPath: "" })],
    })

    expect(result.documentsUsed).toBe(0)
    expect(result.sources).toEqual([])
    expect(result.prompt).toContain("(sin fuentes relevantes)")
  })

  it("devuelve un prompt sin fuentes cuando no llegan documentos (caso límite)", async () => {
    const result = await buildContext({ query: "q", documents: [] })

    expect(result.documentsUsed).toBe(0)
    expect(result.totalContextCharacters).toBe(0)
    expect(result.prompt).toContain("(sin fuentes relevantes)")
    expect(getArticleDocumentTextMock).not.toHaveBeenCalled()
  })

  it("elimina documentos duplicados por contenido normalizado", async () => {
    getArticleDocumentTextMock.mockResolvedValue("Mismo contenido exacto")
    const result = await buildContext({
      query: "q",
      documents: [
        makeResult({ articleId: "a1", rank: 1 }),
        makeResult({ articleId: "a2", rank: 2 }),
      ],
    })

    expect(result.documentsUsed).toBe(1)
    expect(result.sources[0].articleId).toBe("a1")
  })

  it("respeta maxDocuments y descarta el resto en orden de relevancia", async () => {
    getArticleDocumentTextMock.mockImplementation(async (path: string) => `contenido de ${path}`)
    const documents = [
      makeResult({ articleId: "a1", rank: 1, documentPath: "p1" }),
      makeResult({ articleId: "a2", rank: 2, documentPath: "p2" }),
      makeResult({ articleId: "a3", rank: 3, documentPath: "p3" }),
    ]

    const result = await buildContext({ query: "q", documents }, { maxDocuments: 2 })

    expect(result.documentsUsed).toBe(2)
    expect(result.sources.map((s) => s.articleId)).toEqual(["a1", "a2"])
  })

  it("trunca el contenido de un documento a maxCharactersPerDocument", async () => {
    getArticleDocumentTextMock.mockResolvedValue("x".repeat(100))
    const result = await buildContext(
      { query: "q", documents: [makeResult()] },
      { maxCharactersPerDocument: 10 }
    )

    expect(result.totalContextCharacters).toBe(10)
  })

  it("detiene la selección al superar maxContextCharacters, sin dejarlo vacío", async () => {
    getArticleDocumentTextMock
      .mockResolvedValueOnce("a".repeat(20))
      .mockResolvedValueOnce("b".repeat(20))

    const documents = [
      makeResult({ articleId: "a1", rank: 1, documentPath: "p1" }),
      makeResult({ articleId: "a2", rank: 2, documentPath: "p2" }),
    ]

    const result = await buildContext(
      { query: "q", documents },
      { maxContextCharacters: 25, maxCharactersPerDocument: 100 }
    )

    // Solo el primer documento cabe (20 <= 25); el segundo lo excede y se descarta.
    expect(result.documentsUsed).toBe(1)
    expect(result.sources[0].articleId).toBe("a1")
  })

  it("incluye el primer documento truncado al espacio restante si ni ese cabe entero (caso límite)", async () => {
    getArticleDocumentTextMock.mockResolvedValue("z".repeat(50))

    const result = await buildContext(
      { query: "q", documents: [makeResult()] },
      { maxContextCharacters: 10, maxCharactersPerDocument: 100 }
    )

    expect(result.documentsUsed).toBe(1)
    expect(result.totalContextCharacters).toBe(10)
  })

  it("propaga el error si falla la obtención del contenido del documento", async () => {
    getArticleDocumentTextMock.mockRejectedValue(new Error("fallo de storage"))

    await expect(
      buildContext({ query: "q", documents: [makeResult()] })
    ).rejects.toThrow("fallo de storage")
  })
})
