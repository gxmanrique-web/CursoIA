import { z } from "zod"
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"

import { getArticleById } from "../readhub.js"
import { articleShape } from "./shared/article-shape.js"

/**
 * Obtiene un artículo por id. Reutiliza `getArticleById`
 * (`@readhub/database`) tal cual — sin transformación adicional.
 */
export function registerGetArticleTool(server: McpServer): void {
  server.registerTool(
    "get_article",
    {
      title: "Get Article",
      description: "Obtiene un artículo de ReadHub por su id.",
      inputSchema: {
        id: z.string().min(1).describe("Id (uuid) del artículo."),
      },
      outputSchema: {
        article: articleShape.nullable(),
      },
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ id }) => {
      const article = await getArticleById(id)

      if (!article) {
        return {
          content: [{ type: "text", text: `No existe ningún artículo con id "${id}".` }],
          structuredContent: { article: null },
        }
      }

      return {
        content: [{ type: "text", text: JSON.stringify(article, null, 2) }],
        structuredContent: { article },
      }
    }
  )
}
