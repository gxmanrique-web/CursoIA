import { Logo } from "@/components/navigation/logo"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-4 py-8 sm:py-12">
      <Logo />
      <div className="w-full max-w-md">{children}</div>
    </div>
  )
}
