import { z } from "zod"
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"

import { compareArticles } from "../readhub.js"
import { articleRefShape } from "./shared/rag-shapes.js"

/**
 * Compara el contenido de varios artículos explícitos y devuelve el
 * análisis ya generado (a diferencia del Prompt `compare_articles`, que
 * solo arma el mensaje para que el LLM del cliente lo resuelva, esta Tool
 * ejecuta la comparación aquí mismo vía `compareArticles`, útil para
 * clientes que solo quieren el resultado).
 */
export function registerCompareArticlesTool(server: McpServer): void {
  server.registerTool(
    "compare_articles",
    {
      title: "Compare Articles",
      description:
        "Compara el contenido de dos o más artículos de ReadHub (por id), señalando " +
        "similitudes, diferencias y posibles contradicciones entre ellos.",
      inputSchema: {
        articleIds: z
          .array(z.string().min(1))
          .min(2)
          .describe("Ids (uuid) de los artículos a comparar. Mínimo 2."),
      },
      outputSchema: {
        analysis: z.string(),
        articles: z.array(articleRefShape),
      },
      annotations: {
        readOnlyHint: true,
        openWorldHint: true,
      },
    },
    async ({ articleIds }) => {
      const result = await compareArticles(articleIds)

      return {
        content: [{ type: "text", text: result.analysis }],
        structuredContent: { ...result },
      }
    }
  )
}
