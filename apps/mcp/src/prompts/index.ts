import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"

/**
 * Registro central de Prompts MCP. Vacío deliberadamente en esta fase:
 * punto de extensión para plantillas de prompt reutilizables
 * (`server.registerPrompt(...)`), sin implementar todavía.
 */
export function registerPrompts(_server: McpServer): void {}
