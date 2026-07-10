import { NextResponse } from "next/server"

import { getServerUser } from "@/lib/supabase/server"
import { askAssistant } from "@readhub/ai"

/**
 * Punto de entrada server-side del asistente inteligente (Prompt 9). Los
 * componentes React nunca llaman a Supabase ni a Claude directamente: este
 * Route Handler es el único puente entre la interfaz y chat.service.ts
 * (Prompt 8), que a su vez requiere secretos (ANTHROPIC_API_KEY,
 * OPENAI_API_KEY, SUPABASE_SERVICE_ROLE_KEY) que no pueden llegar al
 * navegador. No contiene lógica RAG propia: solo valida la entrada y
 * delega en askAssistant.
 */
export async function POST(request: Request) {
  const user = await getServerUser()
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const query = typeof body?.query === "string" ? body.query.trim() : ""

  if (!query) {
    return NextResponse.json({ error: "La consulta no puede estar vacía." }, { status: 400 })
  }

  try {
    const result = await askAssistant(query)
    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error("[api] POST /api/v1/chat", error)
    return NextResponse.json(
      { error: "No se pudo generar una respuesta. Inténtalo nuevamente." },
      { status: 500 }
    )
  }
}
