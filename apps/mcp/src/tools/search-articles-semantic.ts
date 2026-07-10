import { z } from "zod"
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"

import { searchArticlesSemantic } from "../readhub.js"

const semanticResultShape = z.object({
  rank: z.number(),
  articleId: z.string(),
  title: z.string(),
  summary: z.string().nullable(),
  documentPath: z.string(),
  similarity: z.number(),
})

/**
 * Búsqueda semántica (por significado, vía embeddings + pgvector) sobre
 * artículos indexados. Reutiliza `searchArticlesSemantic`
 * (`vector-search.service` de `@readhub/ai`) tal cual — mismos parámetros,
 * mismo comportamiento que ya usa `chat.service` internamente.
 */
export function registerSearchArticlesSemanticTool(server: McpServer): void {
  server.registerTool(
    "search_articles_semantic",
    {
      title: "Semantic Article Search",
      description:
        "Busca los artículos de ReadHub más relevantes para una consulta en lenguaje " +
        "natural, por similitud semántica (embeddings + pgvector), no por coincidencia " +
        "de texto literal.",
      inputSchema: {
        query: z.string().min(1).describe("Consulta en lenguaje natural."),
        matchCount: z
          .number()
          .int()
          .positive()
          .max(20)
          .optional()
          .describe("Máximo de artículos a devolver (por defecto 5)."),
        matchThreshold: z
          .number()
          .min(0)
          .max(1)
          .optional()
          .describe("Umbral mínimo de similitud coseno, 0-1 (por defecto 0.5)."),
      },
      outputSchema: {
        results: z.array(semanticResultShape),
      },
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ query, matchCount, matchThreshold }) => {
      const results = await searchArticlesSemantic(query, { matchCount, matchThreshold })

      return {
        content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
        structuredContent: { results },
      }
    }
  )
}
