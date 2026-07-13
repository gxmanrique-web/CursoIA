import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"

import { createServer } from "./server.js"

/**
 * El transporte STDIO lee mensajes JSON-RPC de stdin y escribe respuestas a
 * stdout: por eso todo log de diagnóstico de este proceso debe ir a stderr
 * (`console.error`), nunca a stdout. `withObservability`
 * (`packages/shared/observability.ts`, reutilizada por prácticamente todo
 * `@readhub/database`/`@readhub/ai`, es decir por cada Tool/Resource/Prompt
 * de este servidor) usa `console.info` en su camino de éxito — correcto
 * para `apps/web`, pero en este proceso cada llamada exitosa escribiría una
 * línea no-JSON a stdout y corrompería el framing del transporte para el
 * cliente MCP. Se redirige aquí, antes de conectar el transporte, sin
 * tocar `observability.ts` — ese comportamiento sigue siendo correcto para
 * `apps/web`, donde no hay ninguna restricción sobre stdout.
 */
function silenceStdoutLogging(): void {
  console.log = console.error
  console.info = console.error
}

/**
 * Punto de entrada del servidor MCP de ReadHub.
 */
async function main(): Promise<void> {
  silenceStdoutLogging()

  const server = createServer()
  const transport = new StdioServerTransport()

  const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
    console.error(`[readhub-mcp] ${signal} recibido, cerrando servidor MCP...`)
    await server.close()
    process.exit(0)
  }
  process.on("SIGINT", shutdown)
  process.on("SIGTERM", shutdown)

  await server.connect(transport)
  console.error("[readhub-mcp] Servidor MCP conectado (stdio).")
}

main().catch((error) => {
  console.error("[readhub-mcp] Error fatal al iniciar el servidor:", error)
  process.exit(1)
})
