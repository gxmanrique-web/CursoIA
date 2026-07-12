import { beforeEach, describe, expect, it, vi } from "vitest"

const { generateEmbeddingMock, rpcMock, createAdminClientMock } = vi.hoisted(() => ({
  generateEmbeddingMock: vi.fn(),
  rpcMock: vi.fn(),
  createAdminClientMock: vi.fn(),
}))

vi.mock("./embedding.service", () => ({
  generateEmbedding: generateEmbeddingMock,
}))

vi.mock("@readhub/database", () => ({
  createAdminClient: createAdminClientMock,
}))

import { searchArticles } from "./vector-search.service"

describe("searchArticles", () => {
  beforeEach(() => {
    generateEmbeddingMock.mockReset()
    rpcMock.mockReset()
    createAdminClientMock.mockReset()
    createAdminClientMock.mockReturnValue({ rpc: rpcMock })
    generateEmbeddingMock.mockResolvedValue([0.1, 0.2, 0.3])
  })

  it("mapea los resultados de match_article_embeddings a SemanticSearchResult con rank secuencial", async () => {
    rpcMock.mockResolvedValue({
      data: [
        {
          article_id: "a1",
          title: "T1",
          summary: "S1",
          document_path: "p1",
          similarity: 0.9,
        },
        {
          article_id: "a2",
          title: "T2",
          summary: null,
          document_path: "p2",
          similarity: 0.6,
        },
      ],
      error: null,
    })

    const results = await searchArticles("consulta")

    expect(results).toEqual([
      { rank: 1, articleId: "a1", title: "T1", summary: "S1", documentPath: "p1", similarity: 0.9 },
      { rank: 2, articleId: "a2", title: "T2", summary: null, documentPath: "p2", similarity: 0.6 },
    ])
  })

  it("usa matchCount/matchThreshold por defecto cuando no se pasan opciones", async () => {
    rpcMock.mockResolvedValue({ data: [], error: null })

    await searchArticles("consulta")

    expect(rpcMock).toHaveBeenCalledWith("match_article_embeddings", {
      query_embedding: [0.1, 0.2, 0.3],
      match_threshold: 0.5,
      match_count: 5,
    })
  })

  it("propaga matchCount/matchThreshold personalizados", async () => {
    rpcMock.mockResolvedValue({ data: [], error: null })

    await searchArticles("consulta", { matchCount: 10, matchThreshold: 0.2 })

    expect(rpcMock).toHaveBeenCalledWith("match_article_embeddings", {
      query_embedding: [0.1, 0.2, 0.3],
      match_threshold: 0.2,
      match_count: 10,
    })
  })

  it("devuelve un arreglo vacío si no hay coincidencias (data vacío)", async () => {
    rpcMock.mockResolvedValue({ data: [], error: null })
    await expect(searchArticles("consulta")).resolves.toEqual([])
  })

  it("devuelve un arreglo vacío si data es null (caso límite)", async () => {
    rpcMock.mockResolvedValue({ data: null, error: null })
    await expect(searchArticles("consulta")).resolves.toEqual([])
  })

  it("lanza el error de Supabase si el RPC falla", async () => {
    rpcMock.mockResolvedValue({ data: null, error: new Error("rpc falló") })
    await expect(searchArticles("consulta")).rejects.toThrow("rpc falló")
  })

  it("propaga el error si falla la generación del embedding de la consulta", async () => {
    generateEmbeddingMock.mockRejectedValue(new Error("OPENAI_API_KEY no configurada"))
    await expect(searchArticles("consulta")).rejects.toThrow("OPENAI_API_KEY no configurada")
    expect(rpcMock).not.toHaveBeenCalled()
  })
})
