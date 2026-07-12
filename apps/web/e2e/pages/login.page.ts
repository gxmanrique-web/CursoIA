import type { Locator, Page } from "@playwright/test"

/**
 * Page Object de /login (app/(auth)/login/page.tsx). Solo conoce selectores
 * y acciones; las aserciones de negocio viven en el spec, no aquí.
 */
export class LoginPage {
  readonly page: Page
  readonly emailInput: Locator
  readonly passwordInput: Locator
  readonly submitButton: Locator
  readonly errorAlert: Locator
  readonly registerLink: Locator

  constructor(page: Page) {
    this.page = page
    this.emailInput = page.getByLabel("Correo electrónico")
    this.passwordInput = page.getByLabel("Contraseña")
    this.submitButton = page.getByRole("button", { name: "Iniciar sesión" })
    // page.getByRole("alert") también matchea el route announcer interno de
    // Next.js (#__next-route-announcer__, siempre presente en el DOM); se
    // acota al data-slot del componente Alert (components/ui/alert.tsx) para
    // apuntar únicamente al mensaje de error real.
    this.errorAlert = page.locator('[data-slot="alert"]')
    this.registerLink = page.getByRole("link", { name: "Regístrate" })
  }

  async goto() {
    await this.page.goto("/login")
  }

  async fillCredentials(email: string, password: string) {
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)
  }

  async submit() {
    await this.submitButton.click()
  }

  /** Flujo completo de envío del formulario, tal como lo haría un usuario real. */
  async login(email: string, password: string) {
    await this.fillCredentials(email, password)
    await this.submit()
  }
}
