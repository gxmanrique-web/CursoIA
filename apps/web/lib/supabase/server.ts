import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { Database } from "@readhub/types"

/**
 * Usuario autenticado para Server Components/Layouts (p. ej. el guard de
 * `app/(dashboard)/layout.tsx`). Vive junto al cliente de servidor porque es
 * una utilidad de sesión SSR, no lógica de negocio: los Server Components no
 * pueden usar Custom Hooks (que son de cliente), así que este es el
 * equivalente de sesión para ese contexto, igual que `lib/supabase/middleware.ts`.
 */
export async function getServerUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user
}

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Se invoca desde un Server Component; la sesión se refresca en el middleware.
          }
        },
      },
    }
  )
}
