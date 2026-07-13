import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"

import { registerArticlesResource } from "./articles.js"
import { registerAuthorsResource } from "./authors.js"
import { registerStatsResource } from "./stats.js"
import { registerInfoResource } from "./info.js"

/**
 * Registro central de Resources MCP. Mismo patrón que `tools/index.ts`:
 * cada Resource vive en su propio archivo con una única función
 * `register<Nombre>Resource(server)`.
 *
 * No se implementa un Resource de "categorías": ReadHub no tiene ningún
 * concepto de categoría en su esquema (`supabase/schema.sql` solo define
 * `profiles`, `articles`, `views`, `likes`, `comments`, `favorites`) ni en
 * la capa de servicios existente — añadirlo requeriría inventar una regla
 * de negocio nueva, lo cual está fuera del alcance de esta fase.
 */
export function registerResources(server: McpServer): void {
  registerArticlesResource(server)
  registerAuthorsResource(server)
  registerStatsResource(server)
  registerInfoResource(server)
}
