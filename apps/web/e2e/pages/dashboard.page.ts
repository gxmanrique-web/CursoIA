import type { Locator, Page } from "@playwright/test"

/**
 * Page Object del layout autenticado (app/(dashboard)/layout.tsx +
 * components/navigation/navbar.tsx). Cubre lo que es común a todas las
 * páginas del dashboard: navegación principal, identidad del usuario y logout.
 */
export class DashboardPage {
  readonly page: Page
  readonly primaryNav: Locator
  readonly logoutButton: Locator

  constructor(page: Page) {
    this.page = page
    this.primaryNav = page.getByRole("navigation", { name: "Navegación principal" })
    this.logoutButton = page.getByRole("button", { name: "Cerrar sesión" })
  }

  /** Enlace de navegación principal por su etiqueta visible (p. ej. "Inicio"). */
  navLink(label: string): Locator {
    return this.primaryNav.getByRole("link", { name: label })
  }

  /** El navbar muestra el email de la sesión activa (ver Navbar userLabel). */
  userLabel(email: string): Locator {
    return this.page.getByText(email, { exact: true })
  }

  async logout() {
    await this.logoutButton.click()
  }
}
