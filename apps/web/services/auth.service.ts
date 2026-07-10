import { createClient } from "@/lib/supabase/client"
import { withObservability } from "@readhub/shared/observability"
import type { Profile } from "@readhub/types"

const SERVICE = "auth.service"

export interface SignUpInput {
  email: string
  password: string
  birthDate: string
  phone: string
}

export interface SignInInput {
  email: string
  password: string
}

/**
 * Registra un usuario nuevo. El trigger `on_auth_user_created` inserta
 * automáticamente su fila en `profiles`; aquí solo se completan
 * `birth_date`/`phone`, que el trigger deja en null.
 *
 * Requiere `auth.email.enable_confirmations = false` (así está en
 * supabase/config.toml) para que la sesión quede activa de inmediato y el
 * UPDATE sobre `profiles` pase la política `profiles_update_own`.
 */
async function _signUp({ email, password, birthDate, phone }: SignUpInput) {
  const supabase = createClient()

  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) throw error

  if (data.user) {
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ birth_date: birthDate, phone })
      .eq("id", data.user.id)

    if (profileError) throw profileError
  }

  return data
}

async function _signIn({ email, password }: SignInInput) {
  const supabase = createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) throw error
  return data
}

async function _signOut() {
  const supabase = createClient()
  const { error } = await supabase.auth.signOut()

  if (error) throw error
}

/**
 * Usuario autenticado actual junto con su perfil (`profiles`).
 * Devuelve `null` si no hay sesión activa.
 */
async function _getCurrentUser() {
  const supabase = createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) throw error
  if (!user) return null

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  if (profileError) throw profileError

  return { user, profile: profile as Profile }
}

export const signUp = withObservability(SERVICE, "signUp", _signUp)
export const signIn = withObservability(SERVICE, "signIn", _signIn)
export const signOut = withObservability(SERVICE, "signOut", _signOut)
export const getCurrentUser = withObservability(SERVICE, "getCurrentUser", _getCurrentUser)
