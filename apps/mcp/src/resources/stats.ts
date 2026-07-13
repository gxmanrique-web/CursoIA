import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"

import { getPlatformStats } from "../readhub.js"

const STATS_URI = "readhub://stats"

/**
 * Resource estático (sin plantilla, sin `id`) con las estadísticas
 * agregadas de la plataforma: conteos de artículos, autores, likes, vistas
 * y comentarios, vía `getPlatformStats`.
 */
export function registerStatsResource(server: McpServer): void {
  server.registerResource(
    "stats",
    STATS_URI,
    {
      title: "Estadísticas de ReadHub",
      description: "Conteos globales de artículos, autores, likes, vistas y comentarios en ReadHub.",
      mimeType: "application/json",
    },
    async (uri) => {
      const stats = await getPlatformStats()

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(stats, null, 2),
          },
        ],
      }
    }
  )
}
