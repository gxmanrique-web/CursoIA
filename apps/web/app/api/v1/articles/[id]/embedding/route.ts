import { NextResponse } from "next/server"

import { createClient, getServerUser } from "@/lib/supabase/server"
import { createAdminClient } from "@readhub/database"
import { indexArticle } from "@readhub/ai"

export const runtime = "nodejs"

/**
 * Punto de entrada server-side de la indexación automática. Tiene que vivir
 * aquí, en el servidor, porque indexArticle necesita VOYAGE_API_KEY y
 * SUPABASE_SERVICE_ROLE_KEY, secretos que nunca deben llegar al navegador.
 *
 * Comprueba sesión y autoría con el cliente de sesión (respeta RLS: un
 * artículo público de otro autor también sería legible, así que la
 * comprobación de `author_id` es la que realmente autoriza). El propio
 * indexArticle corre con el cliente admin: article_chunks no tiene ningún
 * grant para `anon`/`authenticated` (la única puerta de lectura es la
 * función SQL match_article_chunks — ver migración create_article_chunks),
 * así que ninguna sesión de usuario puede escribir ahí directamente.
 *
 * Idempotente: invocarlo N veces deja el mismo estado (embedding.service
 * borra e inserta los fragmentos en cada corrida).
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getServerUser()
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 })
  }

  const { id } = await params

  const supabase = await createClient()
  const { data: article, error } = await supabase
    .from("articles")
    .select("id, title, summary, document_path, author_id")
    .eq("id", id)
    .maybeSingle()

  if (error) {
    console.error("[api] POST /api/v1/articles/[id]/embedding", error)
    return NextResponse.json({ error: "No se pudo leer el artículo." }, { status: 500 })
  }
  if (!article) {
    return NextResponse.json({ error: "Artículo no encontrado." }, { status: 404 })
  }
  if (article.author_id !== user.id) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 })
  }

  try {
    const admin = createAdminClient()
    const result = await indexArticle(admin, {
      id: article.id,
      title: article.title,
      summary: article.summary,
      documentPath: article.document_path,
    })
    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error("[api] POST /api/v1/articles/[id]/embedding", error)
    return NextResponse.json(
      { error: "No se pudo generar el embedding del artículo." },
      { status: 500 }
    )
  }
}
