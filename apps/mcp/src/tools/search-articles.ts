import { z } from "zod"
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"

import { searchArticlesByKeyword } from "../readhub.js"
import { articleShape } from "./shared/article-shape.js"

const MAX_LIMIT = 50

/**
 * Búsqueda por palabra clave (título/resumen) sobre artículos públicos.
 * Reutiliza `searchArticlesByKeyword` (`@readhub/database`); el recorte a
 * `limit` es presentación, igual que en `list_articles`.
 */
export function registerSearchArticlesTool(server: McpServer): void {
  server.registerTool(
    "search_articles",
    {
      title: "Search Articles",
      description:
        "Busca artículos públicos de ReadHub cuyo título o resumen contenga la consulta " +
        "(coincidencia de texto, no semántica — para búsqueda por significado usa " +
        "search_articles_semantic).",
      inputSchema: {
        query: z.string().min(1).describe("Texto a buscar en título o resumen."),
        limit: z.number().int().positive().max(MAX_LIMIT).optional().describe("Máximo de resultados."),
      },
      outputSchema: {
        articles: z.array(articleShape),
      },
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ query, limit }) => {
      const articles = await searchArticlesByKeyword(query)
      const limited = limit ? articles.slice(0, limit) : articles

      return {
        content: [{ type: "text", text: JSON.stringify(limited, null, 2) }],
        structuredContent: { articles: limited },
      }
    }
  )
}
