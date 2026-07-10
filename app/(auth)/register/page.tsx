"use client"

import { useState, type SubmitEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AlertCircle, CheckCircle2 } from "lucide-react"

import { useAuth } from "@/hooks/useAuth"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { FormField } from "@/components/forms/form-field"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

// Tiempo que se muestra el mensaje de éxito antes de entrar a la página
// principal (Flujo 2: "mostrará un mensaje... y accederá a la página principal").
const SUCCESS_REDIRECT_DELAY_MS = 1200

export default function RegisterPage() {
  const router = useRouter()
  const { signUp, isSigningUp, error } = useAuth()
  const [email, setEmail] = useState("")
  const [birthDate, setBirthDate] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [isSuccess, setIsSuccess] = useState(false)

  const today = new Date().toISOString().split("T")[0]

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault()

    try {
      await signUp({ email, password, birthDate, phone })
      setIsSuccess(true)
      setTimeout(() => {
        router.push("/")
        router.refresh()
      }, SUCCESS_REDIRECT_DELAY_MS)
    } catch {
      setPassword("")
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Crear cuenta</CardTitle>
        <CardDescription>Únete a ReadHub para leer y publicar artículos</CardDescription>
      </CardHeader>
      <CardContent>
        {isSuccess ? (
          <Alert>
            <CheckCircle2 />
            <AlertTitle>Registro exitoso</AlertTitle>
            <AlertDescription>Te llevamos a la página principal…</AlertDescription>
          </Alert>
        ) : (
          <>
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle />
                  <AlertTitle>No se pudo completar el registro</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <FormField label="Correo electrónico" htmlFor="email" required>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={isSigningUp}
                />
              </FormField>

              <FormField label="Fecha de nacimiento" htmlFor="birthDate" required>
                <Input
                  id="birthDate"
                  type="date"
                  max={today}
                  required
                  value={birthDate}
                  onChange={(event) => setBirthDate(event.target.value)}
                  disabled={isSigningUp}
                />
              </FormField>

              <FormField label="Número celular" htmlFor="phone" required>
                <Input
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  required
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  disabled={isSigningUp}
                />
              </FormField>

              <FormField
                label="Contraseña"
                htmlFor="password"
                required
                description="Mínimo 6 caracteres."
              >
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={6}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={isSigningUp}
                />
              </FormField>

              <Button type="submit" className="w-full" disabled={isSigningUp}>
                {isSigningUp && <Spinner />}
                Registrarse
              </Button>
            </form>

            <p className="mt-4 text-center text-sm text-muted-foreground">
              ¿Ya tienes cuenta?{" "}
              <Link href="/login" className="font-medium text-primary hover:underline">
                Inicia sesión
              </Link>
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
