import { cn } from "@/lib/utils"

interface FormActionsProps {
  children: React.ReactNode
  className?: string
}

function FormActions({ children, className }: FormActionsProps) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end",
        className
      )}
    >
      {children}
    </div>
  )
}

export { FormActions }
