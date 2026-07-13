import { z } from "zod"
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"

import { resolveArticleContent, formatArticleBlock } from "../readhub.js"

const DEFAULT_QUESTION_COUNT = 5

/**
 * Plantilla para generar preguntas de comprensión/discusión sobre un
 * artículo, p. ej. para estudio o para preparar una revisión por pares.
 */
export function registerGenerateQuestionsPrompt(server: McpServer): void {
  server.registerPrompt(
    "generate_questions",
    {
      title: "Generar preguntas sobre un artículo",
      description: "Genera preguntas de comprensión o discusión a partir de un artículo de ReadHub.",
      argsSchema: {
        articleId: z.string().min(1).describe("Id (uuid) del artículo."),
        count: z
          .string()
          .optional()
          .describe(`Cantidad de preguntas a generar (por defecto ${DEFAULT_QUESTION_COUNT}).`),
      },
    },
    async ({ articleId, count }) => {
      const article = await resolveArticleContent(articleId)
      const parsedCount = count ? Number.parseInt(count, 10) : NaN
      const questionCount = Number.isFinite(parsedCount) && parsedCount > 0 ? parsedCount : DEFAULT_QUESTION_COUNT

      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text:
                `Genera ${questionCount} preguntas de comprensión y discusión sobre el siguiente ` +
                `artículo de ReadHub, ordenadas de más generales a más específicas.\n\n` +
                formatArticleBlock(article),
            },
          },
        ],
      }
    }
  )
}
