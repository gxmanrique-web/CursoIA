import { z } from "zod"
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"

import { resolveArticleContent, formatArticleBlock } from "../readhub.js"

/**
 * Plantilla para extraer los conceptos/términos clave de un artículo, útil
 * como paso previo a indexación manual, etiquetado o construcción de un
 * glosario.
 */
export function registerExtractKeyConceptsPrompt(server: McpServer): void {
  server.registerPrompt(
    "extract_key_concepts",
    {
      title: "Extraer conceptos clave",
      description: "Extrae los conceptos y términos clave de un artículo de ReadHub.",
      argsSchema: {
        articleId: z.string().min(1).describe("Id (uuid) del artículo."),
      },
    },
    async ({ articleId }) => {
      const article = await resolveArticleContent(articleId)

      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text:
                `Extrae los conceptos y términos clave del siguiente artículo de ReadHub. Para ` +
                `cada uno, da una definición de una frase en el contexto del artículo. Devuélvelos ` +
                `como una lista.\n\n` +
                formatArticleBlock(article),
            },
          },
        ],
      }
    }
  )
}
