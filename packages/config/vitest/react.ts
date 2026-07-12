import { defineConfig, mergeConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import tsconfigPaths from "vite-tsconfig-paths"

import baseConfig from "./base.ts"

/**
 * Config para apps/paquetes con componentes React (jsdom + alias de
 * tsconfig, ej. "@/*" en apps/web). tsconfigPaths lee los paths ya
 * declarados en cada tsconfig.json consumidor, sin duplicarlos aquí.
 */
export default mergeConfig(
  baseConfig,
  defineConfig({
    plugins: [react(), tsconfigPaths()],
    test: {
      environment: "jsdom",
    },
  })
)
