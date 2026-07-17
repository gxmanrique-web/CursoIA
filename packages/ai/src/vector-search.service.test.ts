import { beforeEach, describe, expect, it, vi } from "vitest"

const { generateEmbeddingsMock, rpcMock } = vi.hoisted(() => ({
  generateEmbeddingsMock: vi.fn(),
  rpcMock: vi.fn(),
}))

vi.mock("./providers/voyage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./providers/voyage")>()
  return {
    ...actual,
    generateEmbeddings: generateEmbeddingsMock,
  }
})

import { searchArticleChunks } from "./vector-search.service"

function makeSupabase() {
  return { rpc: rpcMock } as unknown as Parameters<typeof searchArticleChunks>[0]
}

describe("searchArticleChunks", () => {
  beforeEach(() => {
    generateEmbeddingsMock.mockReset()
    rpcMock.mockReset()
    generateEmbeddingsMock.mockResolvedValue([[0.1, 0.2, 0.3]])
  })

  it("mapea las filas de match_article_chunks a SemanticSearchResult con rank secuencial", async () => {
    rpcMock.mockResolvedValue({
      data: [
        {
          chunk_id: "c1",
          article_id: "a1",
          chunk_index: 0,
          content: "contenido 1",
          title: "T1",
          summary: "S1",
          similarity: 0.9,
        },
        {
          chunk_id: "c2",
          article_id: "a2",
          chunk_index: 3,
          content: "contenido 2",
          title: "T2",
          summary: null,
          similarity: 0.6,
        },
      ],
      error: null,
    })

    const results = await searchArticleChunks(makeSupabase(), "consulta")

    expect(results).toEqual([
      {
        rank: 1,
        chunkId: "c1",
        articleId: "a1",
        chunkIndex: 0,
        content: "contenido 1",
        title: "T1",
        summary: "S1",
        similarity: 0.9,
      },
      {
        rank: 2,
        chunkId: "c2",
        articleId: "a2",
        chunkIndex: 3,
        content: "contenido 2",
        title: "T2",
        summary: null,
        similarity: 0.6,
      },
    ])
  })

  it("usa matchCount/matchThreshold por defecto y serializa el embedding como literal pgvector", async () => {
    rpcMock.mockResolvedValue({ data: [], error: null })

    await searchArticleChunks(makeSupabase(), "consulta")

    expect(generateEmbeddingsMock).toHaveBeenCalledWith(["consulta"], "query")
    expect(rpcMock).toHaveBeenCalledWith("match_article_chunks", {
      query_embedding: "[0.1,0.2,0.3]",
      match_threshold: 0.5,
      match_count: 5,
    })
  })

  it("propaga matchCount/matchThreshold personalizados", async () => {
    rpcMock.mockResolvedValue({ data: [], error: null })

    await searchArticleChunks(makeSupabase(), "consulta", { matchCount: 10, matchThreshold: 0.2 })

    expect(rpcMock).toHaveBeenCalledWith("match_article_chunks", {
      query_embedding: "[0.1,0.2,0.3]",
      match_threshold: 0.2,
      match_count: 10,
    })
  })

  it("devuelve un arreglo vacío si no hay coincidencias (data vacío)", async () => {
    rpcMock.mockResolvedValue({ data: [], error: null })
    await expect(searchArticleChunks(makeSupabase(), "consulta")).resolves.toEqual([])
  })

  it("devuelve un arreglo vacío si data es null (caso límite)", async () => {
    rpcMock.mockResolvedValue({ data: null, error: null })
    await expect(searchArticleChunks(makeSupabase(), "consulta")).resolves.toEqual([])
  })

  it("lanza el error de Supabase si el RPC falla", async () => {
    rpcMock.mockResolvedValue({ data: null, error: new Error("rpc falló") })
    await expect(searchArticleChunks(makeSupabase(), "consulta")).rejects.toThrow("rpc falló")
  })

  it("propaga el error si falla la generación del embedding de la consulta", async () => {
    generateEmbeddingsMock.mockRejectedValue(new Error("VOYAGE_API_KEY no configurada"))
    await expect(searchArticleChunks(makeSupabase(), "consulta")).rejects.toThrow(
      "VOYAGE_API_KEY no configurada"
    )
    expect(rpcMock).not.toHaveBeenCalled()
  })
})
