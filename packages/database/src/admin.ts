import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@readhub/types"

/**
 * Cliente de Supabase autenticado con SUPABASE_SERVICE_ROLE_KEY, que
 * bypassa RLS. Uso exclusivo de Services que corren en el servidor y nunca
 * deben ejecutarse en el navegador ni exponerse a componentes cliente:
 * generación de embeddings, indexación automática y el servicio
 * conversacional. `article_embeddings` no tiene políticas RLS para
 * `anon`/`authenticated` (ver migración `create_article_embeddings`), así
 * que este cliente es el único capaz de leer/escribir en esa tabla.
 *
 * Memoizado a nivel de módulo (mismo patrón que los clientes de OpenAI y
 * Anthropic en embedding.service.ts / chat.service.ts): no tiene estado por
 * request (sin cookies, sin sesión de usuario), así que reutilizarlo evita
 * reconstruir el wrapper HTTP en cada llamada a un Service sin ningún
 * riesgo de filtrar estado entre requests (Prompt 11, optimización de
 * rendimiento).
 */
let adminClient: SupabaseClient<Database> | null = null

export function createAdminClient(): SupabaseClient<Database> {
  if (!adminClient) {
    adminClient = createSupabaseClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )
  }
  return adminClient
}
