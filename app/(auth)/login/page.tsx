"use client"

import { useState, type SubmitEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AlertCircle } from "lucide-react"

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

export default function LoginPage() {
  const router = useRouter()
  const { signIn, isSigningIn, error } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault()

    try {
      await signIn({ email, password })
      router.push("/")
      router.refresh()
    } catch {
      // El mensaje de error ya lo expone el hook; solo se limpia la
      // contraseña, el correo permanece visible (Flujo 3).
      setPassword("")
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Iniciar sesión</CardTitle>
        <CardDescription>Accede a tu cuenta de ReadHub</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertTitle>No se pudo iniciar sesión</AlertTitle>
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
              disabled={isSigningIn}
            />
          </FormField>

          <FormField label="Contraseña" htmlFor="password" required>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={isSigningIn}
            />
          </FormField>

          <Button type="submit" className="w-full" disabled={isSigningIn}>
            {isSigningIn && <Spinner />}
            Iniciar sesión
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          ¿No tienes cuenta?{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Regístrate
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
