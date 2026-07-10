"use client"

import { useState, type SubmitEvent } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle } from "lucide-react"

import { useUpload } from "@/hooks/useUpload"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { FormField } from "@/components/forms/form-field"
import { FormActions } from "@/components/forms/form-actions"
import { FileInput } from "@/components/forms/file-input"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

export default function UploadPage() {
  const router = useRouter()
  const { publish, isUploading, fieldErrors, error } = useUpload()

  const [title, setTitle] = useState("")
  const [summary, setSummary] = useState("")
  const [document, setDocument] = useState<File | null>(null)
  const [cover, setCover] = useState<File | null>(null)

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault()

    try {
      const article = await publish({
        title,
        summary,
        document,
        cover,
      })

      // `publish` devuelve `null` cuando falló la validación de campos
      // (fieldErrors ya quedó actualizado); solo se redirige si se publicó.
      if (article) {
        router.push("/")
        router.refresh()
      }
    } catch {
      // El error general de la operación ya lo expone el hook (`error`).
    }
  }

  function handleCancel() {
    router.push("/")
  }

  return (
    <div className="mx-auto max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Cargar artículo</CardTitle>
          <CardDescription>
            Comparte un nuevo artículo con la comunidad de ReadHub.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle />
                <AlertTitle>No se pudo publicar el artículo</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <FormField
              label="Título"
              htmlFor="title"
              required
              error={fieldErrors.title}
            >
              <Input
                id="title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                disabled={isUploading}
                aria-invalid={Boolean(fieldErrors.title)}
              />
            </FormField>

            <FormField
              label="Resumen"
              htmlFor="summary"
              description="Opcional: un breve adelanto que se mostrará en el listado."
            >
              <Textarea
                id="summary"
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
                disabled={isUploading}
                rows={3}
              />
            </FormField>

            <FormField
              label="Documento"
              htmlFor="document"
              required
              error={fieldErrors.document}
              description={fieldErrors.document ? undefined : "Formatos permitidos: TXT, DOCX o PDF."}
            >
              <FileInput
                id="document"
                label="Selecciona el documento del artículo"
                accept=".txt,.docx,.pdf"
                fileName={document?.name}
                onFileSelect={setDocument}
                disabled={isUploading}
              />
            </FormField>

            <FormField
              label="Imagen de portada"
              htmlFor="cover"
              required
              error={fieldErrors.cover}
            >
              <FileInput
                id="cover"
                label="Selecciona la imagen de portada"
                accept="image/*"
                fileName={cover?.name}
                onFileSelect={setCover}
                disabled={isUploading}
              />
            </FormField>

            <FormActions>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isUploading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isUploading}>
                {isUploading && <Spinner />}
                Publicar
              </Button>
            </FormActions>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
