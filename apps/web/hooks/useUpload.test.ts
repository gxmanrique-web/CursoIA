import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { getCurrentUserMock, createArticleMock, uploadDocumentMock, uploadCoverMock } = vi.hoisted(
  () => ({
    getCurrentUserMock: vi.fn(),
    createArticleMock: vi.fn(),
    uploadDocumentMock: vi.fn(),
    uploadCoverMock: vi.fn(),
  })
)

vi.mock("@/services/auth.service", () => ({ getCurrentUser: getCurrentUserMock }))
vi.mock("@/services/article.service", () => ({ createArticle: createArticleMock }))
vi.mock("@/services/storage.service", () => ({
  uploadArticleDocument: uploadDocumentMock,
  uploadArticleCover: uploadCoverMock,
}))

import { useUpload } from "./useUpload"

function makeFile(name: string, type = "text/plain") {
  return new File(["contenido"], name, { type })
}

describe("useUpload (validaciones del Flujo 6)", () => {
  beforeEach(() => {
    getCurrentUserMock.mockReset()
    createArticleMock.mockReset()
    uploadDocumentMock.mockReset()
    uploadCoverMock.mockReset()
  })

  it("rechaza título vacío sin llamar a ningún servicio", async () => {
    const { result } = renderHook(() => useUpload())

    let published: unknown
    await act(async () => {
      published = await result.current.publish({
        title: "   ",
        document: makeFile("doc.txt"),
        cover: makeFile("cover.png", "image/png"),
      })
    })

    expect(published).toBeNull()
    expect(result.current.fieldErrors.title).toBe("El título no puede estar vacío.")
    expect(getCurrentUserMock).not.toHaveBeenCalled()
  })

  it("rechaza documento faltante", async () => {
    const { result } = renderHook(() => useUpload())

    await act(async () => {
      await result.current.publish({
        title: "Título",
        document: null,
        cover: makeFile("cover.png", "image/png"),
      })
    })

    expect(result.current.fieldErrors.document).toBe("Debes seleccionar un documento.")
  })

  it("rechaza extensión de documento no permitida (caso límite de formato)", async () => {
    const { result } = renderHook(() => useUpload())

    await act(async () => {
      await result.current.publish({
        title: "Título",
        document: makeFile("doc.exe"),
        cover: makeFile("cover.png", "image/png"),
      })
    })

    expect(result.current.fieldErrors.document).toBe(
      "El documento debe tener formato TXT, DOCX o PDF."
    )
  })

  it("rechaza portada faltante", async () => {
    const { result } = renderHook(() => useUpload())

    await act(async () => {
      await result.current.publish({ title: "Título", document: makeFile("doc.txt"), cover: null })
    })

    expect(result.current.fieldErrors.cover).toBe("Debes seleccionar una imagen de portada.")
  })

  it("rechaza portada con tipo MIME no soportado", async () => {
    const { result } = renderHook(() => useUpload())

    await act(async () => {
      await result.current.publish({
        title: "Título",
        document: makeFile("doc.txt"),
        cover: makeFile("cover.txt", "text/plain"),
      })
    })

    expect(result.current.fieldErrors.cover).toBe("El archivo de portada debe ser una imagen válida.")
  })

  it("publica exitosamente cuando todos los campos son válidos", async () => {
    getCurrentUserMock.mockResolvedValue({ user: { id: "author-1" } })
    uploadDocumentMock.mockResolvedValue("author-1/id/doc.txt")
    uploadCoverMock.mockResolvedValue("author-1/id/cover.png")
    createArticleMock.mockResolvedValue({ id: "id", title: "Título" })

    const { result } = renderHook(() => useUpload())

    let published: unknown
    await act(async () => {
      published = await result.current.publish({
        title: "Título",
        document: makeFile("doc.txt"),
        cover: makeFile("cover.png", "image/png"),
      })
    })

    expect(published).toEqual({ id: "id", title: "Título" })
    expect(result.current.fieldErrors).toEqual({})
    expect(result.current.error).toBeNull()
    expect(uploadDocumentMock).toHaveBeenCalledWith("author-1", expect.any(String), expect.any(File))
    expect(createArticleMock).toHaveBeenCalledWith(
      expect.objectContaining({ authorId: "author-1", title: "Título" })
    )
  })

  it("falla con mensaje claro si no hay sesión activa", async () => {
    getCurrentUserMock.mockResolvedValue(null)
    const { result } = renderHook(() => useUpload())

    await act(async () => {
      await expect(
        result.current.publish({
          title: "Título",
          document: makeFile("doc.txt"),
          cover: makeFile("cover.png", "image/png"),
        })
      ).rejects.toThrow("Debes iniciar sesión para publicar un artículo.")
    })

    await waitFor(() => {
      expect(result.current.error).toBe("Debes iniciar sesión para publicar un artículo.")
    })
    expect(result.current.isUploading).toBe(false)
    expect(createArticleMock).not.toHaveBeenCalled()
  })

  it("propaga y expone el error si falla la creación del artículo", async () => {
    getCurrentUserMock.mockResolvedValue({ user: { id: "author-1" } })
    uploadDocumentMock.mockResolvedValue("path/doc.txt")
    uploadCoverMock.mockResolvedValue("path/cover.png")
    createArticleMock.mockRejectedValue(new Error("insert failed"))

    const { result } = renderHook(() => useUpload())

    await act(async () => {
      await expect(
        result.current.publish({
          title: "Título",
          document: makeFile("doc.txt"),
          cover: makeFile("cover.png", "image/png"),
        })
      ).rejects.toThrow("insert failed")
    })

    expect(result.current.error).toBe("insert failed")
    expect(result.current.isUploading).toBe(false)
  })
})
