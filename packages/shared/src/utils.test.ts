import { describe, expect, it } from "vitest"

import { cn, formatAuthorLabel, formatDate } from "./utils"

describe("cn", () => {
  it("une clases estáticas simples", () => {
    expect(cn("a", "b")).toBe("a b")
  })

  it("resuelve conflictos de Tailwind quedándose con la última clase", () => {
    expect(cn("p-2", "p-4")).toBe("p-4")
  })

  it("ignora valores falsy (entradas condicionales típicas de JSX)", () => {
    expect(cn("a", false, undefined, null, "b")).toBe("a b")
  })

  it("devuelve string vacío cuando no hay clases válidas", () => {
    expect(cn()).toBe("")
  })
})

describe("formatDate", () => {
  it("formatea un string ISO en español (día, mes largo, año)", () => {
    // Hora fija al mediodía para que la conversión de zona horaria del
    // entorno de ejecución no desplace el día (evita falsos negativos en CI).
    expect(formatDate("2026-07-10T12:00:00")).toBe("10 de julio de 2026")
  })

  it("formatea un objeto Date", () => {
    expect(formatDate(new Date(2026, 0, 1))).toBe("1 de enero de 2026")
  })
})

describe("formatAuthorLabel", () => {
  it("usa los primeros 8 caracteres del id del autor", () => {
    expect(formatAuthorLabel("abcdefgh-1234-5678-9999-000000000000")).toBe("Usuario abcdefgh")
  })

  it("no falla si el id es más corto que 8 caracteres (caso límite)", () => {
    expect(formatAuthorLabel("ab")).toBe("Usuario ab")
  })

  it("devuelve 'Usuario ' sin sufijo si el id es vacío", () => {
    expect(formatAuthorLabel("")).toBe("Usuario ")
  })
})
