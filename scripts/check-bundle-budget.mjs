#!/usr/bin/env node
// Parsea la tabla "Route (app) ... First Load JS" que imprime `next build`
// y falla si alguna ruta (o el JS compartido) excede el presupuesto. No
// depende de manifiestos internos de Next (cambian entre versiones); la
// tabla de stdout es la interfaz estable que Next expone para esto.
import { readFileSync } from "node:fs"

const BUDGET_KB = Number(process.env.BUNDLE_ROUTE_BUDGET_KB ?? 250)
const SHARED_BUDGET_KB = Number(process.env.BUNDLE_SHARED_BUDGET_KB ?? 150)

const logPath = process.argv[2]
if (!logPath) {
  console.error("Uso: check-bundle-budget.mjs <ruta-al-log-de-next-build>")
  process.exit(1)
}

const lines = readFileSync(logPath, "utf8").split("\n")

function toKb(num, unit) {
  const value = Number(num)
  if (unit === "MB") return value * 1024
  if (unit === "B") return value / 1024
  return value
}

const routeRegex = /^[┌├└]\s+[ƒ○●]\s+(\S+)\s+([\d.]+)\s+(\w+)\s+([\d.]+)\s+(\w+)$/
const sharedRegex = /^\+\s+First Load JS shared by all\s+([\d.]+)\s+(\w+)$/

const violations = []
const routes = []
let sharedKb = null

for (const rawLine of lines) {
  const line = rawLine.trim()

  const routeMatch = line.match(routeRegex)
  if (routeMatch) {
    const [, route, , , firstLoadNum, firstLoadUnit] = routeMatch
    const kb = toKb(firstLoadNum, firstLoadUnit)
    routes.push({ route, kb })
    if (kb > BUDGET_KB) {
      violations.push(`${route}: First Load JS ${kb.toFixed(1)} kB > presupuesto ${BUDGET_KB} kB`)
    }
    continue
  }

  const sharedMatch = line.match(sharedRegex)
  if (sharedMatch) {
    sharedKb = toKb(sharedMatch[1], sharedMatch[2])
  }
}

if (routes.length === 0) {
  console.error(
    "No se encontró ninguna ruta en el log de build; ¿cambió el formato de salida de `next build`?"
  )
  process.exit(1)
}

if (sharedKb !== null && sharedKb > SHARED_BUDGET_KB) {
  violations.push(
    `First Load JS shared by all: ${sharedKb.toFixed(1)} kB > presupuesto ${SHARED_BUDGET_KB} kB`
  )
}

console.log(`Presupuesto por ruta: ${BUDGET_KB} kB | Presupuesto compartido: ${SHARED_BUDGET_KB} kB\n`)
routes.forEach(({ route, kb }) => console.log(`  ${route.padEnd(30)} ${kb.toFixed(1)} kB`))
if (sharedKb !== null) console.log(`\n  Compartido por todas las rutas: ${sharedKb.toFixed(1)} kB`)

if (violations.length > 0) {
  console.error("\nPresupuesto de bundle excedido:")
  violations.forEach((v) => console.error(`  - ${v}`))
  process.exit(1)
}

console.log("\nBundle dentro del presupuesto.")
