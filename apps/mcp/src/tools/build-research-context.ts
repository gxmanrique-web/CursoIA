import { z } from "zod"
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"

import { buildResearchContext } from "../readhub.js"
import { sourceShape } from "./shared/rag-shapes.js"

/**
 * Construye el contexto documental (fuentes recuperadas + prompts ya
 * ensamblados) para una consulta de investigación, sin invocar a Groq —
 * mismo pipeline que usa `ask_assistant` internamente, expuesto para que un
 * cliente MCP con su propio LLM pueda reutilizar la recuperación y
 * construcción de contexto de ReadHub en vez de reimplementarla.
 */
export function registerBuildResearchContextTool(server: McpServer): void {
  server.registerTool(
    "build_research_context",
    {
      title: "Build Research Context",
      description:
        "Recupera los artículos de ReadHub más relevantes para una consulta y arma un contexto " +
        "documental listo para un LLM, sin generar ninguna respuesta — solo la recuperación y " +
        "el ensamblado del prompt.",
      inputSchema: {
        query: z.string().min(1).describe("Consulta o tema de investigación en lenguaje natural."),
        matchCount: z
          .number()
          .int()
          .positive()
          .max(20)
          .optional()
          .describe("Máximo de artículos a recuperar antes de seleccionar los del contexto (por defecto 5)."),
        matchThreshold: z
          .number()
          .min(0)
          .max(1)
          .optional()
          .describe("Umbral mínimo de similitud coseno, 0-1 (por defecto 0.5)."),
        maxDocuments: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Máximo de documentos que entran al contexto final (por defecto 4)."),
      },
      outputSchema: {
        systemPrompt: z.string(),
        userPrompt: z.string(),
        sources: z.array(sourceShape),
        documentsRetrieved: z.number(),
        documentsUsed: z.number(),
      },
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ query, matchCount, matchThreshold, maxDocuments }) => {
      const result = await buildResearchContext(query, {
        search: { matchCount, matchThreshold },
        context: { maxDocuments },
      })

      return {
        content: [{ type: "text", text: result.userPrompt }],
        structuredContent: { ...result },
      }
    }
  )
}
