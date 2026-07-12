import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { withObservability } from "./observability"

describe("withObservability", () => {
  let infoSpy: ReturnType<typeof vi.spyOn>
  let errorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    infoSpy = vi.spyOn(console, "info").mockImplementation(() => {})
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    infoSpy.mockRestore()
    errorSpy.mockRestore()
  })

  it("devuelve el resultado de la función envuelta sin transformarlo", async () => {
    const fn = vi.fn(async (a: number, b: number) => a + b)
    const wrapped = withObservability("svc", "add", fn)

    await expect(wrapped(2, 3)).resolves.toBe(5)
    expect(fn).toHaveBeenCalledWith(2, 3)
  })

  it("registra un log de éxito con status success", async () => {
    const fn = vi.fn(async () => "ok")
    const wrapped = withObservability("svc", "method", fn)

    await wrapped()

    expect(infoSpy).toHaveBeenCalledTimes(1)
    expect(infoSpy).toHaveBeenCalledWith(
      "[services] svc.method",
      expect.objectContaining({ status: "success" })
    )
    expect(errorSpy).not.toHaveBeenCalled()
  })

  it("re-lanza el error original tal cual (sin envolverlo)", async () => {
    const originalError = new Error("boom")
    const fn = vi.fn(async () => {
      throw originalError
    })
    const wrapped = withObservability("svc", "method", fn)

    await expect(wrapped()).rejects.toBe(originalError)
  })

  it("registra un log de error con el mensaje cuando la función falla", async () => {
    const fn = vi.fn(async () => {
      throw new Error("algo salió mal")
    })
    const wrapped = withObservability("svc", "method", fn)

    await expect(wrapped()).rejects.toThrow("algo salió mal")

    expect(errorSpy).toHaveBeenCalledTimes(1)
    expect(errorSpy).toHaveBeenCalledWith(
      "[services] svc.method",
      expect.objectContaining({ status: "error", message: "algo salió mal" })
    )
    expect(infoSpy).not.toHaveBeenCalled()
  })

  it("convierte a string un error que no es instancia de Error (caso límite)", async () => {
    const fn = vi.fn(async () => {
      // eslint-disable-next-line @typescript-eslint/no-throw-literal
      throw "string plano"
    })
    const wrapped = withObservability("svc", "method", fn)

    await expect(wrapped()).rejects.toBe("string plano")
    expect(errorSpy).toHaveBeenCalledWith(
      "[services] svc.method",
      expect.objectContaining({ message: "string plano" })
    )
  })
})
