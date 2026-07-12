import { beforeEach, describe, expect, it, vi } from "vitest"

const { createClientMock } = vi.hoisted(() => ({ createClientMock: vi.fn() }))

vi.mock("@/lib/supabase/client", () => ({ createClient: createClientMock }))

import { getCurrentUser, signIn, signOut, signUp } from "@/services/auth.service"

function makeSupabaseClient(overrides: {
  signUp?: unknown
  signInWithPassword?: unknown
  signOut?: unknown
  getUser?: unknown
  profileUpdate?: { error: unknown }
  profileSelect?: { data: unknown; error: unknown }
}) {
  const profileBuilder = {
    update: vi.fn(() => ({ eq: vi.fn(async () => overrides.profileUpdate ?? { error: null }) })),
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(async () => overrides.profileSelect ?? { data: null, error: null }),
      })),
    })),
  }

  return {
    auth: {
      signUp: vi.fn(async () => overrides.signUp),
      signInWithPassword: vi.fn(async () => overrides.signInWithPassword),
      signOut: vi.fn(async () => overrides.signOut ?? { error: null }),
      getUser: vi.fn(async () => overrides.getUser),
    },
    from: vi.fn(() => profileBuilder),
  }
}

describe("auth.service", () => {
  beforeEach(() => {
    createClientMock.mockReset()
  })

  describe("signUp", () => {
    it("crea el usuario y completa birth_date/phone en profiles", async () => {
      const client = makeSupabaseClient({
        signUp: { data: { user: { id: "u1" } }, error: null },
      })
      createClientMock.mockReturnValue(client)

      const result = await signUp({
        email: "a@b.com",
        password: "secret",
        birthDate: "2000-01-01",
        phone: "123",
      })

      expect(result).toEqual({ user: { id: "u1" } })
      expect(client.from).toHaveBeenCalledWith("profiles")
    })

    it("no actualiza profiles si no hay usuario (caso límite: confirmación de email pendiente)", async () => {
      const client = makeSupabaseClient({ signUp: { data: { user: null }, error: null } })
      createClientMock.mockReturnValue(client)

      await signUp({ email: "a@b.com", password: "x", birthDate: "2000-01-01", phone: "1" })

      expect(client.from).not.toHaveBeenCalled()
    })

    it("lanza el error si signUp falla", async () => {
      const client = makeSupabaseClient({ signUp: { data: null, error: new Error("email en uso") } })
      createClientMock.mockReturnValue(client)

      await expect(
        signUp({ email: "a@b.com", password: "x", birthDate: "2000-01-01", phone: "1" })
      ).rejects.toThrow("email en uso")
    })

    it("lanza el error si falla la actualización del perfil", async () => {
      const client = makeSupabaseClient({
        signUp: { data: { user: { id: "u1" } }, error: null },
        profileUpdate: { error: new Error("profile update failed") },
      })
      createClientMock.mockReturnValue(client)

      await expect(
        signUp({ email: "a@b.com", password: "x", birthDate: "2000-01-01", phone: "1" })
      ).rejects.toThrow("profile update failed")
    })
  })

  describe("signIn", () => {
    it("devuelve la sesión en credenciales válidas", async () => {
      const client = makeSupabaseClient({
        signInWithPassword: { data: { session: {} }, error: null },
      })
      createClientMock.mockReturnValue(client)

      await expect(signIn({ email: "a@b.com", password: "x" })).resolves.toEqual({ session: {} })
    })

    it("lanza el error en credenciales inválidas", async () => {
      const client = makeSupabaseClient({
        signInWithPassword: { data: null, error: new Error("Invalid login credentials") },
      })
      createClientMock.mockReturnValue(client)

      await expect(signIn({ email: "a@b.com", password: "x" })).rejects.toThrow(
        "Invalid login credentials"
      )
    })
  })

  describe("signOut", () => {
    it("resuelve sin valor en éxito", async () => {
      createClientMock.mockReturnValue(makeSupabaseClient({ signOut: { error: null } }))
      await expect(signOut()).resolves.toBeUndefined()
    })

    it("lanza el error si falla", async () => {
      createClientMock.mockReturnValue(makeSupabaseClient({ signOut: { error: new Error("fail") } }))
      await expect(signOut()).rejects.toThrow("fail")
    })
  })

  describe("getCurrentUser", () => {
    it("devuelve null si no hay sesión activa", async () => {
      createClientMock.mockReturnValue(
        makeSupabaseClient({ getUser: { data: { user: null }, error: null } })
      )
      await expect(getCurrentUser()).resolves.toBeNull()
    })

    it("devuelve usuario + perfil cuando hay sesión", async () => {
      const client = makeSupabaseClient({
        getUser: { data: { user: { id: "u1" } }, error: null },
        profileSelect: { data: { id: "u1", full_name: "Ada" }, error: null },
      })
      createClientMock.mockReturnValue(client)

      await expect(getCurrentUser()).resolves.toEqual({
        user: { id: "u1" },
        profile: { id: "u1", full_name: "Ada" },
      })
    })

    it("lanza el error si falla la consulta del usuario", async () => {
      createClientMock.mockReturnValue(
        makeSupabaseClient({ getUser: { data: { user: null }, error: new Error("auth error") } })
      )
      await expect(getCurrentUser()).rejects.toThrow("auth error")
    })

    it("lanza el error si falla la consulta del perfil", async () => {
      const client = makeSupabaseClient({
        getUser: { data: { user: { id: "u1" } }, error: null },
        profileSelect: { data: null, error: new Error("profile not found") },
      })
      createClientMock.mockReturnValue(client)

      await expect(getCurrentUser()).rejects.toThrow("profile not found")
    })
  })
})
