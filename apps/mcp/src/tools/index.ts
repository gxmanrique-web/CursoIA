import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"

import { registerListArticlesTool } from "./list-articles.js"
import { registerGetArticleTool } from "./get-article.js"
import { registerSearchArticlesTool } from "./search-articles.js"
import { registerSearchArticlesSemanticTool } from "./search-articles-semantic.js"
import { registerAskAssistantTool } from "./ask-assistant.js"
import { registerCompareArticlesTool } from "./compare-articles.js"
import { registerExtractMainThemesTool } from "./extract-main-themes.js"
import { registerGenerateGlobalSummaryTool } from "./generate-global-summary.js"
import { registerFindRelatedArticlesTool } from "./find-related-articles.js"
import { registerBuildResearchContextTool } from "./build-research-context.js"

/**
 * Registro central de Tools MCP. Cada Tool vive en su propio archivo y
 * expone una única función `register<Nombre>Tool(server)`; añadir una Tool
 * nueva es agregar un archivo en este directorio y una línea aquí, sin
 * tocar las demás — mismo patrón que `packages/ai` (un Service por
 * archivo, cada uno con una responsabilidad).
 */
export function registerTools(server: McpServer): void {
  registerListArticlesTool(server)
  registerGetArticleTool(server)
  registerSearchArticlesTool(server)
  registerSearchArticlesSemanticTool(server)
  registerAskAssistantTool(server)
  registerCompareArticlesTool(server)
  registerExtractMainThemesTool(server)
  registerGenerateGlobalSummaryTool(server)
  registerFindRelatedArticlesTool(server)
  registerBuildResearchContextTool(server)
}
