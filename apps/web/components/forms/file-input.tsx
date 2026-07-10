"use client"

import { useId, useRef } from "react"
import { UploadCloud, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@readhub/shared"

interface FileInputProps {
  id?: string
  label?: string
  accept?: string
  fileName?: string | null
  onFileSelect: (file: File | null) => void
  disabled?: boolean
  className?: string
}

function FileInput({
  id,
  label = "Selecciona un archivo",
  accept,
  fileName,
  onFileSelect,
  disabled,
  className,
}: FileInputProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className={cn("space-y-2", className)}>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept}
        disabled={disabled}
        className="sr-only"
        onChange={(event) => onFileSelect(event.target.files?.[0] ?? null)}
      />

      {fileName ? (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-3 py-2 text-sm dark:bg-input/30">
          <span className="truncate text-foreground">{fileName}</span>
          <button
            type="button"
            aria-label="Quitar archivo"
            disabled={disabled}
            onClick={() => {
              onFileSelect(null)
              if (inputRef.current) inputRef.current.value = ""
            }}
            className="-m-1.5 shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-input px-4 py-6 text-center transition-colors hover:bg-muted/50",
            disabled && "pointer-events-none opacity-50"
          )}
        >
          <UploadCloud className="size-5 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">{label}</span>
          <span className="text-xs text-muted-foreground">
            Haz clic para explorar tus archivos
          </span>
        </label>
      )}

      {fileName && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          Cambiar archivo
        </Button>
      )}
    </div>
  )
}

export { FileInput }
