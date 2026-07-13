import { z } from "zod"
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"

import { resolveArticleContent, formatArticleBlock } from "../readhub.js"

/**
 * Plantilla para explicar un artículo en lenguaje más accesible, ajustable
 * por nivel de audiencia. Mismo patrón que `summarize_article`: solo
 * incrusta el contenido, sin explicarlo aquí.
 */
export function registerExplainArticlePrompt(server: McpServer): void {
  server.registerPrompt(
    "explain_article",
    {
      title: "Explicar artículo",
      description: "Explica el contenido de un artículo de ReadHub de forma clara, para un público concreto.",
      argsSchema: {
        articleId: z.string().min(1).describe("Id (uuid) del artículo a explicar."),
        audienceLevel: z
          .string()
          .optional()
          .describe(
            'Nivel de la audiencia destino, p. ej. "principiante", "estudiante" o "experto" ' +
              '(por defecto "principiante").'
          ),
      },
    },
    async ({ articleId, audienceLevel }) => {
      const article = await resolveArticleContent(articleId)
      const audience = audienceLevel?.trim() || "principiante"

      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text:
                `Explica el siguiente artículo de ReadHub de forma clara para una audiencia de ` +
                `nivel "${audience}", evitando o aclarando la jerga técnica que esa audiencia no ` +
                `dominaría, sin perder precisión sobre el contenido original.\n\n` +
                formatArticleBlock(article),
            },
          },
        ],
      }
    }
  )
}
