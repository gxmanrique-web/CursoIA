import { z } from "zod"
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"

import { generateGlobalSummary } from "../readhub.js"
import { articleRefShape } from "./shared/rag-shapes.js"

/**
 * Genera un resumen único que integra el contenido de varios artículos, vía
 * `generateGlobalSummary` — a diferencia del Prompt `summarize_article`
 * (que resume uno solo, delegando la redacción al LLM del cliente), esta
 * Tool produce directamente un resumen de conjunto.
 */
export function registerGenerateGlobalSummaryTool(server: McpServer): void {
  server.registerTool(
    "generate_global_summary",
    {
      title: "Generate Global Summary",
      description:
        "Genera un resumen único que integra el contenido de uno o varios artículos de ReadHub " +
        "(por id), destacando cómo se relacionan entre sí.",
      inputSchema: {
        articleIds: z
          .array(z.string().min(1))
          .min(1)
          .describe("Ids (uuid) de los artículos a resumir conjuntamente."),
      },
      outputSchema: {
        summary: z.string(),
        articles: z.array(articleRefShape),
      },
      annotations: {
        readOnlyHint: true,
        openWorldHint: true,
      },
    },
    async ({ articleIds }) => {
      const result = await generateGlobalSummary(articleIds)

      return {
        content: [{ type: "text", text: result.summary }],
        structuredContent: { ...result },
      }
    }
  )
}
