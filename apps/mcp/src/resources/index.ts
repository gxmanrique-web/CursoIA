import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"

/**
 * Registro central de Resources MCP. Vacío deliberadamente en esta fase:
 * punto de extensión para exponer artículos u otro contenido de ReadHub
 * como Resources (`server.registerResource(...)`), sin acceder aún a
 * Supabase.
 */
export function registerResources(_server: McpServer): void {}
