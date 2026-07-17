import { createClient } from "@/lib/supabase/client"
import { withObservability } from "@readhub/shared/observability"
import type { Article } from "@readhub/types"

const SERVICE = "article.service"

export interface ArticleWithStats extends Article {
  viewsCount: number
  likesCount: number
}

export interface CreateArticleInput {
  id: string
  authorId: string
  title: string
  summary?: string | null
  documentPath: string
  imagePath?: string | null
}

export interface UpdateArticleInput {
  title?: string
  summary?: string | null
}

type ArticleRowWithCounts = Article & {
  likes: { count: number }[] | null
  views: { count: number }[] | null
}

function withStats(row: ArticleRowWithCounts): ArticleWithStats {
  const { likes, views, ...article } = row
  return {
    ...article,
    likesCount: likes?.[0]?.count ?? 0,
    viewsCount: views?.[0]?.count ?? 0,
  }
}

/**
 * Dispara la indexación automática en la base vectorial. Se invoca al
 * publicar y al editar un artículo: editar el título o el resumen invalida
 * los embeddings anteriores, porque forman parte del texto vectorizado
 * (embedding.service antepone título+resumen a cada fragmento).
 *
 * NO DEBE LANZAR NUNCA: es un efecto secundario de publicar, su fallo jamás
 * puede tumbar esa operación, que ya se completó correctamente en Supabase
 * en este punto. Por eso no se propaga el error, solo se informa el
 * resultado como boolean para que quien llama pueda avisar sin bloquear —
 * y deliberadamente no se espera (`await`) en el flujo de publicación.
 *
 * `keepalive: true` es obligatorio: tras publicar, la UI redirige al inicio
 * de inmediato, y sin keepalive el navegador aborta esta petición a mitad
 * de camino — el artículo quedaría publicado pero nunca indexado, sin
 * ningún error visible en consola.
 */
async function triggerEmbeddingIndexing(articleId: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/v1/articles/${articleId}/embedding`, {
      method: "POST",
      keepalive: true,
    })
    return response.ok
  } catch (error) {
    console.error("[article.service] No se pudo disparar la indexación del artículo:", error)
    return false
  }
}

/**
 * Lista los artículos públicos para el listado principal, más recientes primero.
 *
 * LIMITACIÓN CONOCIDA (RLS de la sesión anterior, no modificada aquí):
 * `likes_select_own` solo permite ver los likes del propio usuario, y
 * `views_select_admin_or_author` solo permite ver las vistas si eres el
 * autor del artículo o admin. Por lo tanto `likesCount`/`viewsCount` que
 * devuelve esta función solo reflejan filas visibles para el usuario que
 * hace la consulta (típicamente 0 o 1 en artículos ajenos), no el total
 * real. Corregirlo exige una función `security definer` (RPC) o ampliar
 * esas políticas de SELECT — pendiente de decisión antes de mostrarlo en UI.
 */
async function _getArticles(): Promise<ArticleWithStats[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("articles")
    .select("*, likes(count), views(count)")
    .eq("is_public", true)
    .order("created_at", { ascending: false })

  if (error) throw error

  return (data as unknown as ArticleRowWithCounts[]).map(withStats)
}

/** Ver también la limitación de conteos documentada en {@link _getArticles}. */
async function _getArticleById(id: string): Promise<ArticleWithStats | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("articles")
    .select("*, likes(count), views(count)")
    .eq("id", id)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  return withStats(data as unknown as ArticleRowWithCounts)
}

async function _createArticle(input: CreateArticleInput): Promise<Article> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("articles")
    .insert({
      id: input.id,
      author_id: input.authorId,
      title: input.title,
      summary: input.summary ?? null,
      document_path: input.documentPath,
      image_path: input.imagePath ?? null,
    })
    .select()
    .single()

  if (error) throw error
  void triggerEmbeddingIndexing(data.id)
  return data
}

async function _updateArticle(id: string, input: UpdateArticleInput): Promise<Article> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("articles")
    .update(input)
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  void triggerEmbeddingIndexing(id)
  return data
}

/**
 * No dispara ninguna limpieza de embeddings: article_chunks tiene
 * `article_id ... references articles(id) on delete cascade` (migración
 * create_article_chunks), así que Postgres borra los fragmentos asociados
 * automáticamente y de forma atómica junto con el artículo. No hay forma de
 * dejar un registro huérfano incluso si esta función falla a mitad de
 * camino o el artículo se borra por otra vía (SQL directo, etc.).
 */
async function _deleteArticle(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from("articles").delete().eq("id", id)

  if (error) throw error
}

async function _registerView(articleId: string, userId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from("views")
    .insert({ article_id: articleId, user_id: userId })

  if (error) throw error
}

async function _hasLiked(articleId: string, userId: string): Promise<boolean> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("likes")
    .select("id")
    .eq("article_id", articleId)
    .eq("user_id", userId)
    .maybeSingle()

  if (error) throw error
  return Boolean(data)
}

async function _likeArticle(articleId: string, userId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from("likes")
    .insert({ article_id: articleId, user_id: userId })

  if (error) throw error
}

async function _unlikeArticle(articleId: string, userId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from("likes")
    .delete()
    .eq("article_id", articleId)
    .eq("user_id", userId)

  if (error) throw error
}

export const getArticles = withObservability(SERVICE, "getArticles", _getArticles)
export const getArticleById = withObservability(SERVICE, "getArticleById", _getArticleById)
export const createArticle = withObservability(SERVICE, "createArticle", _createArticle)
export const updateArticle = withObservability(SERVICE, "updateArticle", _updateArticle)
export const deleteArticle = withObservability(SERVICE, "deleteArticle", _deleteArticle)
export const registerView = withObservability(SERVICE, "registerView", _registerView)
export const hasLiked = withObservability(SERVICE, "hasLiked", _hasLiked)
export const likeArticle = withObservability(SERVICE, "likeArticle", _likeArticle)
export const unlikeArticle = withObservability(SERVICE, "unlikeArticle", _unlikeArticle)
