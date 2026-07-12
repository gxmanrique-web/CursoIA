import { SEEDED_USERS } from "./data/users"
import { expect, test } from "./support/fixtures"

const NAV_LINKS = ["Inicio", "Cargar artículo", "Asistente"] as const

test.describe("Flujo principal de autenticación", () => {
  test("login con credenciales válidas, navegación autenticada y logout", async ({
    page,
    loginPage,
    dashboardPage,
  }) => {
    const user = SEEDED_USERS.writer

    await test.step("abrir la aplicación sin sesión activa", async () => {
      await page.goto("/")

      // Sin sesión, el middleware (lib/supabase/middleware.ts) redirige
      // cualquier ruta privada a /login: llegar aquí ya confirma que la
      // protección de rutas real está funcionando, no es un atajo del test.
      await expect(page).toHaveURL(/\/login$/)
    })

    await test.step("acceder a Login", async () => {
      await expect(loginPage.emailInput).toBeVisible()
      await expect(loginPage.passwordInput).toBeVisible()
      await expect(loginPage.submitButton).toBeEnabled()
    })

    await test.step("ingresar credenciales válidas y autenticarse", async () => {
      await loginPage.login(user.email, user.password)
    })

    await test.step("validar la redirección al Dashboard", async () => {
      await expect(page).toHaveURL("/")
      await expect(loginPage.errorAlert).not.toBeVisible()
    })

    await test.step("comprobar que la información del usuario fue cargada", async () => {
      // El navbar (Navbar userLabel) muestra el email de la sesión real
      // obtenida en el servidor (getServerUser), no un valor mockeado.
      await expect(dashboardPage.userLabel(user.email)).toBeVisible()
    })

    await test.step("verificar que la navegación principal esté disponible", async () => {
      await expect(dashboardPage.primaryNav).toBeVisible()

      for (const label of NAV_LINKS) {
        await expect(dashboardPage.navLink(label)).toBeVisible()
      }
    })

    await test.step("cerrar sesión", async () => {
      await dashboardPage.logout()
    })

    await test.step("comprobar el regreso al Login", async () => {
      await expect(page).toHaveURL(/\/login$/)
      await expect(loginPage.emailInput).toBeVisible()
      await expect(loginPage.passwordInput).toBeVisible()

      // La sesión quedó realmente cerrada: recargar /  vuelve a rebotar a
      // /login en vez de mostrar el dashboard desde caché de cliente.
      await page.goto("/")
      await expect(page).toHaveURL(/\/login$/)
    })
  })

  test("credenciales inválidas no autentican ni redirigen al Dashboard", async ({
    loginPage,
    page,
  }) => {
    await loginPage.goto()
    await loginPage.login(SEEDED_USERS.writer.email, "contraseña-incorrecta")

    await expect(loginPage.errorAlert).toBeVisible()
    await expect(loginPage.errorAlert).toContainText("Correo electrónico o contraseña incorrectos")
    await expect(page).toHaveURL(/\/login$/)
  })
})
