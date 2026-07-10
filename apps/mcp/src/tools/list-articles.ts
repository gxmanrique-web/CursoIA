import { z } from "zod"
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"

import { getArticles } from "../readhub.js"
import { articleShape } from "./shared/article-shape.js"

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

/**
 * Lista los artículos públicos más recientes. Reutiliza
 * `getArticles` (`@readhub/database`) sin lógica propia — el único
 * añadido es recortar el arreglo ya devuelto a `limit` elementos, que es
 * paginación de presentación, no una regla de negocio nueva.
 */
export function registerListArticlesTool(server: McpServer): void {
  server.registerTool(
    "list_articles",
    {
      title: "List Articles",
      description:
        "Lista los artículos públicos de ReadHub, ordenados del más reciente al más antiguo.",
      inputSchema: {
        limit: z
          .number()
          .int()
          .positive()
          .max(MAX_LIMIT)
          .optional()
          .describe(`Máximo de artículos a devolver (por defecto ${DEFAULT_LIMIT}, máximo ${MAX_LIMIT}).`),
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
    async ({ limit }) => {
      const articles = await getArticles()
      const limited = articles.slice(0, limit ?? DEFAULT_LIMIT)

      return {
        content: [{ type: "text", text: JSON.stringify(limited, null, 2) }],
        structuredContent: { articles: limited },
      }
    }
  )
}
