import { z } from "zod"
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"

import { extractMainThemes } from "../readhub.js"
import { articleRefShape } from "./shared/rag-shapes.js"

/**
 * Extrae los temas principales de uno o varios artículos (compartidos y
 * distintivos cuando son varios), vía `extractMainThemes`.
 */
export function registerExtractMainThemesTool(server: McpServer): void {
  server.registerTool(
    "extract_main_themes",
    {
      title: "Extract Main Themes",
      description:
        "Identifica los temas principales de uno o varios artículos de ReadHub (por id).",
      inputSchema: {
        articleIds: z
          .array(z.string().min(1))
          .min(1)
          .describe("Ids (uuid) de los artículos a analizar."),
      },
      outputSchema: {
        themes: z.string(),
        articles: z.array(articleRefShape),
      },
      annotations: {
        readOnlyHint: true,
        openWorldHint: true,
      },
    },
    async ({ articleIds }) => {
      const result = await extractMainThemes(articleIds)

      return {
        content: [{ type: "text", text: result.themes }],
        structuredContent: { ...result },
      }
    }
  )
}
