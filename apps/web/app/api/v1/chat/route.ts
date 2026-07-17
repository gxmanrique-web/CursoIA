import { NextResponse } from "next/server"

import { createClient, getServerUser } from "@/lib/supabase/server"
import { streamAssistant } from "@readhub/ai"

// Los proveedores (Groq, Voyage) y la extracción de texto requieren Node;
// el runtime Edge no basta.
export const runtime = "nodejs"

// Tope de longitud de la consulta: no es solo validación de entrada, es un
// límite de costo — sin él, un texto de 100 KB se vectoriza (Voyage) y se
// envía como prompt (Groq), y ambos se facturan.
const MAX_QUERY_LENGTH = 2000

function ndjsonLine(event: unknown): string {
  return `${JSON.stringify(event)}\n`
}

/**
 * Punto de entrada server-side del asistente inteligente. Los componentes
 * React nunca llaman a Supabase ni a Groq directamente: este Route Handler
 * es el único puente entre la interfaz y chat.service.ts, que a su vez
 * requiere secretos (GROQ_API_KEY, VOYAGE_API_KEY) que no pueden llegar al
 * navegador. No contiene lógica RAG propia: solo valida la entrada, resuelve
 * la sesión y traduce los eventos de streamAssistant a líneas NDJSON.
 *
 * Usa el cliente de sesión (no el admin): la función SQL
 * match_article_chunks está concedida a `authenticated`, no a `anon`, así
 * que respeta la sesión real del usuario en vez de bypassear RLS.
 */
export async function POST(request: Request) {
  // La sesión se resuelve ANTES de abrir el stream: una vez enviada la
  // primera cabecera de la respuesta ya no se puede volver atrás y
  // responder con un 401.
  const user = await getServerUser()
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const query = typeof body?.query === "string" ? body.query.trim() : ""

  if (!query) {
    return NextResponse.json({ error: "La consulta no puede estar vacía." }, { status: 400 })
  }
  if (query.length > MAX_QUERY_LENGTH) {
    return NextResponse.json(
      { error: `La consulta no puede superar los ${MAX_QUERY_LENGTH} caracteres.` },
      { status: 400 }
    )
  }

  const supabase = await createClient()

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder()
      let aborted = false
      request.signal.addEventListener("abort", () => {
        aborted = true
      })

      try {
        // Las fuentes se emiten en cuanto existen (context-builder ya
        // resolvió y ordenó la búsqueda), antes de que llegue ningún
        // fragmento de texto del LLM.
        for await (const event of streamAssistant(supabase, query)) {
          if (aborted) break
          controller.enqueue(encoder.encode(ndjsonLine(event)))
        }
      } catch (error) {
        // Ya se enviaron cabeceras (status 200): un error a mitad de stream
        // no puede convertirse en un 500, se emite como evento NDJSON.
        console.error("[api] POST /api/v1/chat (stream)", error)
        controller.enqueue(
          encoder.encode(
            ndjsonLine({ type: "error", message: "No se pudo generar una respuesta." })
          )
        )
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  })
}
