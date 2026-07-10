import { createClient } from "@/lib/supabase/client"
import type { Comment } from "@/types/comment"

/**
 * Comentarios de un artículo, del más antiguo al más reciente.
 *
 * NOTA: la política `comments_select_all` permite leer todos los
 * comentarios (anon y authenticated), así que a diferencia de los
 * conteos de `article.service.ts`, esto sí devuelve el total real.
 * El nombre del autor no viaja aquí (solo `user_id`): `profiles` no
 * expone email/nombre y su RLS solo permite leer el perfil propio, así
 * que resolver el nombre del comentarista queda pendiente de una
 * decisión sobre esa política.
 */
export async function getCommentsByArticle(articleId: string): Promise<Comment[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("article_id", articleId)
    .order("created_at", { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function createComment(
  articleId: string,
  userId: string,
  comment: string
): Promise<Comment> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("comments")
    .insert({ article_id: articleId, user_id: userId, comment })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteComment(commentId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from("comments").delete().eq("id", commentId)

  if (error) throw error
}
