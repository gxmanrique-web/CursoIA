import { defineConfig, devices } from "@playwright/test"

const PORT = 3000
const baseURL = `http://localhost:${PORT}`
const isCI = Boolean(process.env.CI)

/**
 * En CI se construye y se levanta la app en modo producción (más cercano al
 * despliegue real y evita el overhead de Fast Refresh); en local se reutiliza
 * "next dev" para iterar rápido y se reconecta a un servidor ya corriendo si
 * existe (reuseExistingServer).
 */
export default defineConfig({
  testDir: "./e2e",
  outputDir: "test-results",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  // "next dev" (Turbopack) compila rutas on-demand: dos workers pidiendo
  // rutas nuevas al mismo tiempo comparten el socket de HMR, y una
  // recompilación disparada por un worker puede interrumpir la navegación
  // del otro (verificado: la misma prueba es 100% estable en serie y flaky
  // en paralelo contra el dev server). En CI se sirve un build de producción
  // ya compilado, sin ese problema, así que ahí sí se paralela.
  workers: isCI ? undefined : 1,
  reporter: isCI
    ? [["list"], ["html", { open: "never" }], ["junit", { outputFile: "test-results/junit.xml" }]]
    : [["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: isCI ? "npm run build && npm run start" : "npm run dev",
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
})
