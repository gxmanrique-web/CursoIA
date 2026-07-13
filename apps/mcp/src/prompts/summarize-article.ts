import { z } from "zod"
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"

import { resolveArticleContent, formatArticleBlock } from "../readhub.js"

/**
 * Plantilla para resumir un artículo. No genera el resumen aquí: solo
 * incrusta el contenido real del artículo (`resolveArticleContent`) en un
 * mensaje de usuario con la instrucción, dejando que el LLM del cliente MCP
 * haga el trabajo — evita duplicar cualquier lógica de generación de texto
 * que ya vive en `chat.service` (`ask_assistant`).
 */
export function registerSummarizeArticlePrompt(server: McpServer): void {
  server.registerPrompt(
    "summarize_article",
    {
      title: "Resumir artículo",
      description: "Genera un resumen del contenido de un artículo publicado en ReadHub.",
      argsSchema: {
        articleId: z.string().min(1).describe("Id (uuid) del artículo a resumir."),
        length: z
          .string()
          .optional()
          .describe('Longitud deseada del resumen, p. ej. "breve" o "detallado" (por defecto "breve").'),
      },
    },
    async ({ articleId, length }) => {
      const article = await resolveArticleContent(articleId)
      const targetLength = length?.trim() || "breve"

      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text:
                `Resume de forma ${targetLength} el siguiente artículo de ReadHub, ` +
                `capturando su idea principal y sus hallazgos o conclusiones más importantes.\n\n` +
                formatArticleBlock(article),
            },
          },
        ],
      }
    }
  )
}
