import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"

const INFO_URI = "readhub://info"

/**
 * Resource estático de orientación: qué es ReadHub y qué otros Resources/
 * Tools tiene disponibles este servidor, para que un cliente MCP nuevo
 * pueda descubrir las capacidades sin tener que leer la documentación del
 * proyecto. Contenido fijo (no consulta Supabase) — se actualiza a mano
 * cuando se añaden Tools/Resources/Prompts nuevos.
 */
export function registerInfoResource(server: McpServer): void {
  server.registerResource(
    "info",
    INFO_URI,
    {
      title: "Información general de ReadHub",
      description: "Qué es ReadHub y qué Tools/Resources expone este servidor MCP.",
      mimeType: "application/json",
    },
    async (uri) => {
      const info = {
        name: "ReadHub",
        description:
          "Plataforma de publicación y descubrimiento de artículos científicos, académicos y técnicos, con búsqueda semántica y un asistente conversacional (RAG) sobre su catálogo.",
        resources: [
          { uri: "readhub://articles", description: "Lista de artículos públicos (navegable por id)." },
          { uri: "readhub://authors", description: "Lista de autores/perfiles (navegable por id)." },
          { uri: "readhub://stats", description: "Estadísticas agregadas de la plataforma." },
        ],
        tools: [
          "list_articles",
          "get_article",
          "search_articles",
          "search_articles_semantic",
          "ask_assistant",
        ],
      }

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(info, null, 2),
          },
        ],
      }
    }
  )
}
