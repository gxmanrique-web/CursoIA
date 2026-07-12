import { defineConfig, mergeConfig } from "vitest/config"

import reactConfig from "@readhub/config/vitest/react"

export default mergeConfig(
  reactConfig,
  defineConfig({
    test: {
      setupFiles: ["./vitest.setup.ts"],
    },
  })
)
