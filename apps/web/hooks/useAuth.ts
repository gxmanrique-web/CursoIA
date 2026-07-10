"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import type { User } from "@supabase/supabase-js"

import {
  getCurrentUser,
  signIn as signInRequest,
  signOut as signOutRequest,
  signUp as signUpRequest,
  type SignInInput,
  type SignUpInput,
} from "@/services/auth.service"
import type { Profile } from "@readhub/types"

interface AuthState {
  user: User | null
  profile: Profile | null
}

const EMPTY_STATE: AuthState = { user: null, profile: null }

// Supabase Auth devuelve sus mensajes en inglés; se traducen los casos más
// comunes para cumplir con "mensajes de error claros" del laboratorio.
const KNOWN_ERROR_MESSAGES: Record<string, string> = {
  "Invalid login credentials": "Correo electrónico o contraseña incorrectos.",
  "User already registered": "Ya existe una cuenta registrada con ese correo electrónico.",
  "Email not confirmed": "Debes confirmar tu correo electrónico antes de iniciar sesión.",
}

function toErrorMessage(err: unknown, fallback: string) {
  const message = err instanceof Error ? err.message : fallback
  return KNOWN_ERROR_MESSAGES[message] ?? message
}

/**
 * Sesión, registro e inicio/cierre de sesión. `signIn`/`signUp` no navegan
 * por sí mismos: cada pantalla decide cuándo redirigir (login lo hace de
 * inmediato, registro puede mostrar antes un mensaje de éxito).
 */
export function useAuth() {
  const router = useRouter()
  const [state, setState] = useState<AuthState>(EMPTY_STATE)
  const [isLoadingUser, setIsLoadingUser] = useState(true)
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [isSigningUp, setIsSigningUp] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    getCurrentUser()
      .then((result) => {
        if (isMounted) setState(result ?? EMPTY_STATE)
      })
      .catch(() => {
        if (isMounted) setState(EMPTY_STATE)
      })
      .finally(() => {
        if (isMounted) setIsLoadingUser(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  const signIn = useCallback(async (input: SignInInput) => {
    setIsSigningIn(true)
    setError(null)
    try {
      await signInRequest(input)
      const result = await getCurrentUser()
      setState(result ?? EMPTY_STATE)
    } catch (err) {
      setError(toErrorMessage(err, "No se pudo iniciar sesión."))
      throw err
    } finally {
      setIsSigningIn(false)
    }
  }, [])

  const signUp = useCallback(async (input: SignUpInput) => {
    setIsSigningUp(true)
    setError(null)
    try {
      await signUpRequest(input)
      const result = await getCurrentUser()
      setState(result ?? EMPTY_STATE)
    } catch (err) {
      setError(toErrorMessage(err, "No se pudo completar el registro."))
      throw err
    } finally {
      setIsSigningUp(false)
    }
  }, [])

  const signOut = useCallback(async () => {
    setIsSigningOut(true)
    try {
      await signOutRequest()
      setState(EMPTY_STATE)
      router.push("/login")
      router.refresh()
    } finally {
      setIsSigningOut(false)
    }
  }, [router])

  return {
    user: state.user,
    profile: state.profile,
    isLoadingUser,
    isSigningIn,
    isSigningUp,
    isSigningOut,
    error,
    signIn,
    signUp,
    signOut,
  }
}
