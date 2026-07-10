import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"

/**
 * Registro central de Tools MCP. Vacío deliberadamente en esta fase: solo
 * se deja preparado el punto de extensión (`server.registerTool(...)` por
 * cada Tool futura, p. ej. `searchArticles`/`askAssistant` sobre
 * `@readhub/ai`), sin implementar lógica de negocio todavía.
 */
export function registerTools(_server: McpServer): void {}
