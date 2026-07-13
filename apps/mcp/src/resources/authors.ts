import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js"

import { getAuthors, getAuthorById } from "../readhub.js"

/**
 * Resource de autores: `readhub://authors` lista todos los perfiles de
 * ReadHub con su conteo de artículos, y `readhub://authors/{id}` expone uno
 * en concreto. `profiles` no tiene un campo de nombre público (ver
 * `packages/types/src/user.ts`), así que el `name` de cada item de listado
 * es el propio `id` — no se inventa un campo que no existe en el esquema.
 */
export function registerAuthorsResource(server: McpServer): void {
  server.registerResource(
    "authors",
    new ResourceTemplate("readhub://authors/{id}", {
      list: async () => {
        const authors = await getAuthors()
        return {
          resources: authors.map((author) => ({
            uri: `readhub://authors/${author.id}`,
            name: author.id,
            description: `${author.role} · ${author.articlesCount} artículo(s)`,
            mimeType: "application/json",
          })),
        }
      },
    }),
    {
      title: "Autor de ReadHub",
      description: "Un perfil de usuario de ReadHub junto con su conteo de artículos públicos.",
      mimeType: "application/json",
    },
    async (uri, { id }) => {
      const author = await getAuthorById(String(id))

      if (!author) {
        throw new Error(`No existe ningún autor con id "${id}".`)
      }

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(author, null, 2),
          },
        ],
      }
    }
  )
}
