import { createAdminClient } from "./admin"
import { withObservability } from "@readhub/shared/observability"

const SERVICE = "database.stats"

export interface PlatformStats {
  articlesCount: number
  publicArticlesCount: number
  authorsCount: number
  likesCount: number
  viewsCount: number
  commentsCount: number
}

/**
 * Conteos globales con `head: true, count: "exact"` (sin traer filas) sobre
 * las mismas tablas que ya usan `articles.ts`/`authors.ts` — ningún cálculo
 * nuevo, solo agregación de lo existente. Archivo separado de `authors.ts`
 * porque estos conteos no son datos de autor, son estadísticas de toda la
 * plataforma.
 */
async function _getPlatformStats(): Promise<PlatformStats> {
  const supabase = createAdminClient()

  const [articles, publicArticles, authors, likes, views, comments] = await Promise.all([
    supabase.from("articles").select("*", { count: "exact", head: true }),
    supabase.from("articles").select("*", { count: "exact", head: true }).eq("is_public", true),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("likes").select("*", { count: "exact", head: true }),
    supabase.from("views").select("*", { count: "exact", head: true }),
    supabase.from("comments").select("*", { count: "exact", head: true }),
  ])

  for (const result of [articles, publicArticles, authors, likes, views, comments]) {
    if (result.error) throw result.error
  }

  return {
    articlesCount: articles.count ?? 0,
    publicArticlesCount: publicArticles.count ?? 0,
    authorsCount: authors.count ?? 0,
    likesCount: likes.count ?? 0,
    viewsCount: views.count ?? 0,
    commentsCount: comments.count ?? 0,
  }
}

export const getPlatformStats = withObservability(SERVICE, "getPlatformStats", _getPlatformStats)
