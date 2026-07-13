import { createAdminClient } from "./admin"
import { withObservability } from "@readhub/shared/observability"
import type { Profile } from "@readhub/types"

const SERVICE = "database.authors"

export interface AuthorWithStats extends Profile {
  articlesCount: number
}

/**
 * `profiles` no tiene nombre para mostrar (ver `packages/types/src/user.ts`):
 * ReadHub identifica autores por `id` (uuid), no por un nombre público. Por
 * eso un "autor" aquí es el perfil tal cual junto con su conteo de
 * artículos públicos, sin inventar un campo `name` que no existe en el
 * esquema.
 */
type ProfileRowWithArticles = Profile & { articles: { count: number }[] | null }

function withArticlesCount(row: ProfileRowWithArticles): AuthorWithStats {
  const { articles, ...profile } = row
  return {
    ...profile,
    articlesCount: articles?.[0]?.count ?? 0,
  }
}

async function _getAuthors(): Promise<AuthorWithStats[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("profiles")
    .select("*, articles(count)")
    .order("created_at", { ascending: false })

  if (error) throw error
  return (data as unknown as ProfileRowWithArticles[]).map(withArticlesCount)
}

async function _getAuthorById(id: string): Promise<AuthorWithStats | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("profiles")
    .select("*, articles(count)")
    .eq("id", id)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  return withArticlesCount(data as unknown as ProfileRowWithArticles)
}

export const getAuthors = withObservability(SERVICE, "getAuthors", _getAuthors)
export const getAuthorById = withObservability(SERVICE, "getAuthorById", _getAuthorById)
