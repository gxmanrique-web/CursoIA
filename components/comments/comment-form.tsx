"use client"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/spinner"

interface CommentFormProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  isSubmitting?: boolean
  error?: string
  placeholder?: string
}

function CommentForm({
  value,
  onChange,
  onSubmit,
  isSubmitting = false,
  error,
  placeholder = "Escribe un comentario…",
}: CommentFormProps) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
      className="space-y-2"
    >
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={isSubmitting}
        aria-invalid={Boolean(error)}
        rows={3}
      />
      {error && (
        <p role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={isSubmitting || value.trim().length === 0}>
          {isSubmitting && <Spinner />}
          Comentar
        </Button>
      </div>
    </form>
  )
}

export { CommentForm }
