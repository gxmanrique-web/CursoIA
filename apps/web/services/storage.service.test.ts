import { beforeEach, describe, expect, it, vi } from "vitest"

const { createClientMock } = vi.hoisted(() => ({ createClientMock: vi.fn() }))

vi.mock("@/lib/supabase/client", () => ({ createClient: createClientMock }))

import {
  getArticleCoverUrl,
  getArticleDocumentUrl,
  removeArticleCover,
  removeArticleDocument,
  uploadArticleCover,
  uploadArticleDocument,
} from "@/services/storage.service"

function makeFile(name: string) {
  return new File(["contenido"], name, { type: "text/plain" })
}

function mockStorage(overrides: {
  upload?: { error: unknown }
  getPublicUrl?: { data: { publicUrl: string } }
  createSignedUrl?: { data: { signedUrl: string } | null; error: unknown }
  remove?: { error: unknown }
}) {
  const bucket = {
    upload: vi.fn(async () => overrides.upload ?? { error: null }),
    getPublicUrl: vi.fn(() => overrides.getPublicUrl ?? { data: { publicUrl: "" } }),
    createSignedUrl: vi.fn(async () => overrides.createSignedUrl ?? { data: null, error: null }),
    remove: vi.fn(async () => overrides.remove ?? { error: null }),
  }
  const from = vi.fn(() => bucket)
  createClientMock.mockReturnValue({ storage: { from } })
  return { from, bucket }
}

describe("storage.service", () => {
  beforeEach(() => {
    createClientMock.mockReset()
  })

  describe("uploadArticleDocument / uploadArticleCover", () => {
    it("construye la ruta <authorId>/<articleId>/<archivo> y sube al bucket correcto", async () => {
      const { from, bucket } = mockStorage({})

      const path = await uploadArticleDocument("author-1", "article-1", makeFile("informe.txt"))

      expect(from).toHaveBeenCalledWith("article-documents")
      expect(path).toBe("author-1/article-1/informe.txt")
      expect(bucket.upload).toHaveBeenCalledWith(
        "author-1/article-1/informe.txt",
        expect.anything(),
        { upsert: true }
      )
    })

    it("normaliza espacios, tildes y mayúsculas en el nombre de archivo (Storage exige claves ASCII)", async () => {
      mockStorage({})
      const path = await uploadArticleDocument(
        "author-1",
        "article-1",
        makeFile("Arte - ficha técnica.PDF")
      )

      expect(path).toBe("author-1/article-1/arte-ficha-tecnica.pdf")
    })

    it("usa 'archivo' como base si el nombre no deja caracteres válidos (caso límite)", async () => {
      mockStorage({})
      const path = await uploadArticleDocument("a", "b", makeFile("!!!.txt"))
      expect(path).toBe("a/b/archivo.txt")
    })

    it("sube la portada al bucket de covers", async () => {
      const { from } = mockStorage({})
      await uploadArticleCover("author-1", "article-1", makeFile("cover.png"))
      expect(from).toHaveBeenCalledWith("article-covers")
    })

    it("lanza el error si la subida falla", async () => {
      mockStorage({ upload: { error: new Error("upload failed") } })
      await expect(
        uploadArticleDocument("a", "b", makeFile("doc.txt"))
      ).rejects.toThrow("upload failed")
    })
  })

  describe("getArticleCoverUrl", () => {
    it("devuelve la URL pública del bucket de covers", () => {
      mockStorage({ getPublicUrl: { data: { publicUrl: "https://cdn/covers/x.png" } } })
      expect(getArticleCoverUrl("x.png")).toBe("https://cdn/covers/x.png")
    })
  })

  describe("getArticleDocumentUrl", () => {
    it("devuelve la URL firmada", async () => {
      mockStorage({ createSignedUrl: { data: { signedUrl: "https://signed" }, error: null } })
      await expect(getArticleDocumentUrl("doc.txt")).resolves.toBe("https://signed")
    })

    it("lanza el error si falla la generación de la URL firmada", async () => {
      mockStorage({ createSignedUrl: { data: null, error: new Error("signed url failed") } })
      await expect(getArticleDocumentUrl("doc.txt")).rejects.toThrow("signed url failed")
    })
  })

  describe("removeArticleDocument / removeArticleCover", () => {
    it("no lanza en éxito", async () => {
      mockStorage({})
      await expect(removeArticleDocument("doc.txt")).resolves.toBeUndefined()
      await expect(removeArticleCover("cover.png")).resolves.toBeUndefined()
    })

    it("lanza el error si falla el borrado", async () => {
      mockStorage({ remove: { error: new Error("remove failed") } })
      await expect(removeArticleDocument("doc.txt")).rejects.toThrow("remove failed")
    })
  })
})
