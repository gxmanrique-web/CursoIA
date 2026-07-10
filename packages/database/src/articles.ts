import { createAdminClient } from "./admin"
import { withObservability } from "@readhub/shared/observability"
import type { Article } from "@readhub/types"

const SERVICE = "database.articles"

export interface ArticleWithStats extends Article {
  likesCount: number
  viewsCount: number
}

type ArticleRowWithCounts = Article & {
  likes: { count: number }[] | null
  views: { count: number }[] | null
}

/**
 * Misma consulta que `apps/web/services/article.service.ts` (mismo
 * `select`, mismo mapeo a `ArticleWithStats`): no hay forma de reutilizar
 * ese archivo directamente porque usa el cliente browser de Supabase
 * (atado a la sesión del usuario en Next.js), inservible fuera de la app
 * web. Aquí se repite la misma forma de consulta pero con el cliente admin
 * (`@readhub/database`), que no depende de sesión de usuario — el único
 * cliente que tiene sentido para un servidor MCP. A diferencia de la
 * versión web, esta SÍ devuelve conteos reales de likes/vistas: el cliente
 * admin bypassa las políticas RLS (`likes_select_own`,
 * `views_select_admin_or_author`) que limitan esos conteos en la app web.
 */
function withStats(row: ArticleRowWithCounts): ArticleWithStats {
  const { likes, views, ...article } = row
  return {
    ...article,
    likesCount: likes?.[0]?.count ?? 0,
    viewsCount: views?.[0]?.count ?? 0,
  }
}

async function _getArticles(): Promise<ArticleWithStats[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("articles")
    .select("*, likes(count), views(count)")
    .eq("is_public", true)
    .order("created_at", { ascending: false })

  if (error) throw error
  return (data as unknown as ArticleRowWithCounts[]).map(withStats)
}

async function _getArticleById(id: string): Promise<ArticleWithStats | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("articles")
    .select("*, likes(count), views(count)")
    .eq("id", id)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  return withStats(data as unknown as ArticleRowWithCounts)
}

/**
 * PostgREST interpreta `,` y `(`/`)` como separadores de condiciones dentro
 * de `.or(...)`; sin escapar, una consulta con comas podría alterar el
 * filtro en vez de buscarse literalmente (p. ej. `"a,id.neq.0"`). Envolver
 * el valor entre comillas dobres (escapando `\` y `"`) es el mecanismo que
 * documenta PostgREST para pasar un valor arbitrario de forma literal.
 */
function escapeForOrFilter(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
}

/**
 * Búsqueda por palabra clave (no semántica) sobre título/resumen de
 * artículos públicos. No existía ninguna capacidad de búsqueda por texto
 * en el proyecto (`article.service.ts` solo lista o busca por id); esta es
 * la única función de este archivo que no tiene un equivalente que
 * "reutilizar" — es la extensión mínima necesaria (una cláusula `ilike`
 * más sobre la misma consulta de `_getArticles`) para cubrir esa
 * capacidad, sin introducir ninguna regla de negocio nueva.
 */
async function _searchArticlesByKeyword(query: string): Promise<ArticleWithStats[]> {
  const escaped = escapeForOrFilter(query)
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("articles")
    .select("*, likes(count), views(count)")
    .eq("is_public", true)
    .or(`title.ilike."%${escaped}%",summary.ilike."%${escaped}%"`)
    .order("created_at", { ascending: false })

  if (error) throw error
  return (data as unknown as ArticleRowWithCounts[]).map(withStats)
}

export const getArticles = withObservability(SERVICE, "getArticles", _getArticles)
export const getArticleById = withObservability(SERVICE, "getArticleById", _getArticleById)
export const searchArticlesByKeyword = withObservability(
  SERVICE,
  "searchArticlesByKeyword",
  _searchArticlesByKeyword
)
