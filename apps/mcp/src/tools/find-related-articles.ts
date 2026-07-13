import { z } from "zod"
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"

import { findRelatedArticles } from "../readhub.js"
import { semanticResultShape } from "./shared/rag-shapes.js"

/**
 * Identifica artículos relacionados con uno dado, reutilizando la búsqueda
 * semántica (`findRelatedArticles` compone la consulta a partir del propio
 * título/resumen del artículo) en vez de una consulta de texto libre.
 */
export function registerFindRelatedArticlesTool(server: McpServer): void {
  server.registerTool(
    "find_related_articles",
    {
      title: "Find Related Articles",
      description:
        "Encuentra artículos de ReadHub relacionados con uno dado, por similitud semántica.",
      inputSchema: {
        articleId: z.string().min(1).describe("Id (uuid) del artículo de referencia."),
        matchCount: z
          .number()
          .int()
          .positive()
          .max(20)
          .optional()
          .describe("Máximo de artículos relacionados a devolver (por defecto 5)."),
        matchThreshold: z
          .number()
          .min(0)
          .max(1)
          .optional()
          .describe("Umbral mínimo de similitud coseno, 0-1 (por defecto 0.5)."),
      },
      outputSchema: {
        articleId: z.string(),
        articleTitle: z.string(),
        related: z.array(semanticResultShape),
      },
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ articleId, matchCount, matchThreshold }) => {
      const result = await findRelatedArticles(articleId, { matchCount, matchThreshold })

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        structuredContent: { ...result },
      }
    }
  )
}
