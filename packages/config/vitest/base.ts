import { defineConfig } from "vitest/config"

/**
 * Config base para paquetes TS puros (sin DOM/React): packages/ai,
 * packages/shared, etc. apps/web y cualquier paquete con componentes debe
 * usar ./react.ts en su lugar.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts", "**/*.test.tsx"],
    exclude: ["**/node_modules/**", "**/dist/**", "**/.next/**", "**/.turbo/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        "**/.next/**",
        "**/*.config.*",
        "**/*.test.*",
      ],
    },
  },
})
