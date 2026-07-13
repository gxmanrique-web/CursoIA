import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"

import { registerSummarizeArticlePrompt } from "./summarize-article.js"
import { registerExplainArticlePrompt } from "./explain-article.js"
import { registerCompareArticlesPrompt } from "./compare-articles.js"
import { registerGenerateQuestionsPrompt } from "./generate-questions.js"
import { registerExtractKeyConceptsPrompt } from "./extract-key-concepts.js"

/**
 * Registro central de Prompts MCP. Mismo patrón que `tools/index.ts` y
 * `resources/index.ts`: cada Prompt vive en su propio archivo con una única
 * función `register<Nombre>Prompt(server)`.
 */
export function registerPrompts(server: McpServer): void {
  registerSummarizeArticlePrompt(server)
  registerExplainArticlePrompt(server)
  registerCompareArticlesPrompt(server)
  registerGenerateQuestionsPrompt(server)
  registerExtractKeyConceptsPrompt(server)
}
