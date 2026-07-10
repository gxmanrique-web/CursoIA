import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"

import { registerTools } from "./tools/index.js"
import { registerResources } from "./resources/index.js"
import { registerPrompts } from "./prompts/index.js"

const SERVER_NAME = "readhub-mcp"
const SERVER_VERSION = "0.0.0"

/**
 * Construye la instancia de McpServer y registra sus Tools/Resources/
 * Prompts. Separado de `index.ts` (que solo elige el transporte y conecta)
 * para poder reutilizar esta misma factory con otros transportes en el
 * futuro (p. ej. HTTP) sin duplicar la configuración del servidor.
 */
export function createServer(): McpServer {
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  })

  registerTools(server)
  registerResources(server)
  registerPrompts(server)

  return server
}
