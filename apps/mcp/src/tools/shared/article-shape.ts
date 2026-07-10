import { z } from "zod"

/**
 * Forma zod compartida por todas las Tools que devuelven artículos
 * (`list_articles`, `get_article`, `search_articles`), reflejando
 * `ArticleWithStats` (`@readhub/database`). Centralizada aquí para que
 * añadir una Tool nueva que también devuelva artículos no repita la forma.
 */
export const articleShape = z.object({
  id: z.string(),
  author_id: z.string(),
  title: z.string(),
  summary: z.string().nullable(),
  document_path: z.string(),
  image_path: z.string().nullable(),
  created_at: z.string(),
  is_public: z.boolean(),
  likesCount: z.number(),
  viewsCount: z.number(),
})
