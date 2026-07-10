import { NextResponse } from "next/server"

import { getServerUser } from "@/lib/supabase/server"
import { generateArticleEmbedding } from "@/services/embedding.service"

/**
 * Punto de entrada server-side de la indexación automática (Prompt 5).
 * article.service.ts lo invoca justo después de crear/actualizar un
 * artículo. Tiene que vivir aquí, en el servidor, porque
 * generateArticleEmbedding necesita OPENAI_API_KEY y
 * SUPABASE_SERVICE_ROLE_KEY, secretos que nunca deben llegar al navegador.
 *
 * Autorización: solo exige una sesión válida (no verifica que el usuario
 * sea el autor del artículo). Es una aceptación consciente de riesgo bajo:
 * en el peor caso, otro usuario autenticado fuerza una regeneración
 * redundante de un embedding ya existente (costo de API, no fuga de datos,
 * ya que el propio embedding nunca se expone al cliente). Se deja anotado
 * como candidato a endurecer en la fase de revisión de seguridad (Prompt 11).
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

  try {
    const result = await generateArticleEmbedding(id)
    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error("[api] POST /api/v1/articles/[id]/embedding", error)
    return NextResponse.json(
      { error: "No se pudo generar el embedding del artículo." },
      { status: 500 }
    )
  }
}
