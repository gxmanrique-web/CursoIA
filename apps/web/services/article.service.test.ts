import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { createClientMock } = vi.hoisted(() => ({ createClientMock: vi.fn() }))

vi.mock("@/lib/supabase/client", () => ({ createClient: createClientMock }))

import {
  createArticle,
  deleteArticle,
  getArticleById,
  getArticles,
  hasLiked,
  likeArticle,
  registerView,
  unlikeArticle,
  updateArticle,
} from "@/services/article.service"

/** Builder encadenable que imita el query builder de Supabase (thenable). */
function makeQueryBuilder(result: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {
    select: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    delete: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => result),
    single: vi.fn(async () => result),
    then: (onFulfilled: (value: unknown) => unknown) => Promise.resolve(result).then(onFulfilled),
  }
  return builder
}

function mockSupabaseFrom(result: { data: unknown; error: unknown }) {
  const builder = makeQueryBuilder(result)
  const from = vi.fn(() => builder)
  createClientMock.mockReturnValue({ from })
  return { from, builder }
}

function spyOnFetch() {
  return vi.spyOn(globalThis, "fetch")
}

describe("article.service", () => {
  let fetchSpy: ReturnType<typeof spyOnFetch>
  let errorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    createClientMock.mockReset()
    fetchSpy = spyOnFetch().mockResolvedValue(new Response(null, { status: 200 }))
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    fetchSpy.mockRestore()
    errorSpy.mockRestore()
  })

  describe("getArticles", () => {
    it("mapea likes/views a conteos numéricos (comportamiento esperado)", async () => {
      mockSupabaseFrom({
        data: [
          { id: "1", is_public: true, likes: [{ count: 3 }], views: [{ count: 10 }] },
        ],
        error: null,
      })

      const articles = await getArticles()

      expect(articles).toEqual([
        { id: "1", is_public: true, likesCount: 3, viewsCount: 10 },
      ])
    })

    it("usa 0 cuando likes/views vienen null (caso límite de RLS)", async () => {
      mockSupabaseFrom({
        data: [{ id: "1", likes: null, views: null }],
        error: null,
      })

      const [article] = await getArticles()
      expect(article.likesCount).toBe(0)
      expect(article.viewsCount).toBe(0)
    })

    it("lanza el error si Supabase devuelve error", async () => {
      mockSupabaseFrom({ data: null, error: new Error("db error") })
      await expect(getArticles()).rejects.toThrow("db error")
    })
  })

  describe("getArticleById", () => {
    it("devuelve null si no existe el artículo", async () => {
      mockSupabaseFrom({ data: null, error: null })
      await expect(getArticleById("missing")).resolves.toBeNull()
    })

    it("lanza el error si Supabase falla", async () => {
      mockSupabaseFrom({ data: null, error: new Error("boom") })
      await expect(getArticleById("1")).rejects.toThrow("boom")
    })
  })

  describe("createArticle", () => {
    it("crea el artículo y dispara la indexación sin bloquear ni fallar (fire-and-forget)", async () => {
      mockSupabaseFrom({ data: { id: "new-id", title: "T" }, error: null })

      const result = await createArticle({
        id: "new-id",
        authorId: "author-1",
        title: "T",
        documentPath: "doc.txt",
      })

      expect(result).toEqual({ id: "new-id", title: "T" })
      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/v1/articles/new-id/embedding",
        expect.objectContaining({ method: "POST" })
      )
    })

    it("no propaga el error si falla el trigger de indexación (best-effort)", async () => {
      mockSupabaseFrom({ data: { id: "new-id" }, error: null })
      fetchSpy.mockRejectedValueOnce(new Error("network down"))

      await expect(
        createArticle({ id: "new-id", authorId: "a", title: "T", documentPath: "d" })
      ).resolves.toEqual({ id: "new-id" })
    })

    it("lanza el error si la inserción falla", async () => {
      mockSupabaseFrom({ data: null, error: new Error("insert failed") })
      await expect(
        createArticle({ id: "1", authorId: "a", title: "T", documentPath: "d" })
      ).rejects.toThrow("insert failed")
      expect(fetchSpy).not.toHaveBeenCalled()
    })
  })

  describe("updateArticle", () => {
    it("actualiza y dispara reindexación", async () => {
      mockSupabaseFrom({ data: { id: "1", title: "Nuevo" }, error: null })
      const result = await updateArticle("1", { title: "Nuevo" })

      expect(result).toEqual({ id: "1", title: "Nuevo" })
      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/v1/articles/1/embedding",
        expect.objectContaining({ method: "POST" })
      )
    })
  })

  describe("deleteArticle", () => {
    it("no lanza si el borrado es exitoso", async () => {
      mockSupabaseFrom({ data: null, error: null })
      await expect(deleteArticle("1")).resolves.toBeUndefined()
    })

    it("lanza el error si el borrado falla", async () => {
      mockSupabaseFrom({ data: null, error: new Error("delete failed") })
      await expect(deleteArticle("1")).rejects.toThrow("delete failed")
    })
  })

  describe("registerView / hasLiked / likeArticle / unlikeArticle", () => {
    it("registerView no lanza en éxito", async () => {
      mockSupabaseFrom({ data: null, error: null })
      await expect(registerView("article-1", "user-1")).resolves.toBeUndefined()
    })

    it("hasLiked devuelve true si existe el registro", async () => {
      mockSupabaseFrom({ data: { id: "like-1" }, error: null })
      await expect(hasLiked("article-1", "user-1")).resolves.toBe(true)
    })

    it("hasLiked devuelve false si no existe (caso límite)", async () => {
      mockSupabaseFrom({ data: null, error: null })
      await expect(hasLiked("article-1", "user-1")).resolves.toBe(false)
    })

    it("likeArticle/unlikeArticle propagan el error de Supabase", async () => {
      mockSupabaseFrom({ data: null, error: new Error("rls violation") })
      await expect(likeArticle("article-1", "user-1")).rejects.toThrow("rls violation")
      await expect(unlikeArticle("article-1", "user-1")).rejects.toThrow("rls violation")
    })
  })
})
