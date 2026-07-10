import { z } from "zod"
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"

import { askAssistant } from "../readhub.js"

const sourceShape = z.object({
  rank: z.number(),
  articleId: z.string(),
  title: z.string(),
  similarity: z.number(),
})

/**
 * Responde una consulta usando el pipeline RAG completo de ReadHub.
 * Reutiliza `askAssistant` (`chat.service` de `@readhub/ai`) tal cual: este
 * archivo no orquesta búsqueda + contexto + LLM por su cuenta, esa lógica
 * ya vive completa en el Service.
 */
export function registerAskAssistantTool(server: McpServer): void {
  server.registerTool(
    "ask_assistant",
    {
      title: "Ask ReadHub Assistant",
      description:
        "Responde una consulta en lenguaje natural usando únicamente el conocimiento " +
        "publicado en ReadHub (RAG: búsqueda semántica + Claude), citando las fuentes " +
        "usadas. Si no hay información suficiente en la plataforma, lo indica en vez de " +
        "inventar una respuesta.",
      inputSchema: {
        query: z.string().min(1).describe("Consulta en lenguaje natural."),
      },
      outputSchema: {
        answer: z.string(),
        sources: z.array(sourceShape),
        metadata: z.object({
          model: z.string(),
          documentsRetrieved: z.number(),
          documentsUsed: z.number(),
        }),
      },
      annotations: {
        readOnlyHint: true,
        openWorldHint: true,
      },
    },
    async ({ query }) => {
      const result = await askAssistant(query)

      return {
        content: [{ type: "text", text: result.answer }],
        structuredContent: {
          answer: result.answer,
          sources: result.sources,
          metadata: {
            model: result.metadata.model,
            documentsRetrieved: result.metadata.documentsRetrieved,
            documentsUsed: result.metadata.documentsUsed,
          },
        },
      }
    }
  )
}
