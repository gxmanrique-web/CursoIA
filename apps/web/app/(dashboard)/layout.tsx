import { redirect } from "next/navigation"

import { getServerUser } from "@/lib/supabase/server"
import { Navbar } from "@/components/navigation/navbar"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getServerUser()

  // El middleware ya protege esta ruta; esta comprobación es una segunda barrera
  // por si el layout llegara a renderizarse sin haber pasado por él.
  if (!user) {
    redirect("/login")
  }

  const userLabel = user.email ?? "Usuario"

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar userLabel={userLabel} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}
