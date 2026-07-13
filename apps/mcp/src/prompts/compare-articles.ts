import { z } from "zod"
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"

import { resolveArticleContent, formatArticleBlock } from "../readhub.js"

/**
 * Plantilla para comparar dos o más artículos. Los argumentos de un Prompt
 * MCP son siempre strings (no hay array nativo), así que `articleIds` es
 * una lista separada por comas, igual que cualquier cliente MCP los
 * escribiría a mano.
 */
export function registerCompareArticlesPrompt(server: McpServer): void {
  server.registerPrompt(
    "compare_articles",
    {
      title: "Comparar artículos",
      description: "Compara dos o más artículos de ReadHub, señalando similitudes, diferencias y posibles contradicciones.",
      argsSchema: {
        articleIds: z
          .string()
          .min(1)
          .describe("Ids (uuid) de los artículos a comparar, separados por comas. Mínimo 2."),
      },
    },
    async ({ articleIds }) => {
      const ids = articleIds
        .split(",")
        .map((id) => id.trim())
        .filter((id) => id.length > 0)

      if (ids.length < 2) {
        throw new Error('"articleIds" debe incluir al menos dos ids de artículo separados por coma.')
      }

      const articles = await Promise.all(ids.map(resolveArticleContent))
      const articlesBlock = articles
        .map((article, index) => `--- Artículo ${index + 1} ---\n${formatArticleBlock(article)}`)
        .join("\n\n")

      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text:
                `Compara los siguientes ${articles.length} artículos de ReadHub. Señala: ` +
                `(1) similitudes en temática o hallazgos, (2) diferencias relevantes de enfoque o ` +
                `alcance, y (3) cualquier posible contradicción entre ellos.\n\n${articlesBlock}`,
            },
          },
        ],
      }
    }
  )
}
