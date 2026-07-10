import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"

import { createServer } from "./server.js"

/**
 * Punto de entrada del servidor MCP de ReadHub. El transporte STDIO lee
 * mensajes JSON-RPC de stdin y escribe respuestas a stdout: por eso todo
 * log de diagnóstico de este proceso va a stderr (`console.error`), nunca a
 * stdout, que un cliente MCP interpretaría como protocolo corrupto.
 */
async function main(): Promise<void> {
  const server = createServer()
  const transport = new StdioServerTransport()

  await server.connect(transport)
  console.error("[readhub-mcp] Servidor MCP conectado (stdio).")
}

main().catch((error) => {
  console.error("[readhub-mcp] Error fatal al iniciar el servidor:", error)
  process.exit(1)
})
