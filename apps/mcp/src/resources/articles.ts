import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js"

import { getArticles, getArticleById } from "../readhub.js"

/**
 * Resource de artículos: `readhub://articles` lista todos los artículos
 * públicos como items navegables, y `readhub://articles/{id}` expone el
 * contenido de uno en concreto. Reutiliza `getArticles`/`getArticleById`
 * (mismas funciones que ya consumen las Tools `list_articles`/
 * `get_article`) — un cliente MCP puede así navegar el catálogo sin invocar
 * una Tool.
 */
export function registerArticlesResource(server: McpServer): void {
  server.registerResource(
    "articles",
    new ResourceTemplate("readhub://articles/{id}", {
      list: async () => {
        const articles = await getArticles()
        return {
          resources: articles.map((article) => ({
            uri: `readhub://articles/${article.id}`,
            name: article.title,
            description: article.summary ?? undefined,
            mimeType: "application/json",
          })),
        }
      },
    }),
    {
      title: "Artículo de ReadHub",
      description: "Un artículo público de ReadHub, con sus contadores de likes y vistas.",
      mimeType: "application/json",
    },
    async (uri, { id }) => {
      const article = await getArticleById(String(id))

      if (!article) {
        throw new Error(`No existe ningún artículo con id "${id}".`)
      }

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(article, null, 2),
          },
        ],
      }
    }
  )
}
