import { test as base } from "@playwright/test"

import { DashboardPage } from "../pages/dashboard.page"
import { LoginPage } from "../pages/login.page"

interface Fixtures {
  loginPage: LoginPage
  dashboardPage: DashboardPage
}

/**
 * Extiende el `test` base de Playwright para inyectar los Page Objects ya
 * instanciados. Mantiene los specs enfocados en el flujo de negocio, sin
 * `new LoginPage(page)` repetido en cada archivo.
 */
export const test = base.extend<Fixtures>({
  // Parámetro renombrado de "use" (nombre convencional de Playwright) a
  // "provideFixture": funcionalmente idéntico, evita que eslint-plugin-react-hooks
  // lo confunda con el hook use() de React (cualquier función que empiece con
  // "use" activa esa regla, y este archivo no es código de componentes).
  loginPage: async ({ page }, provideFixture) => {
    await provideFixture(new LoginPage(page))
  },
  dashboardPage: async ({ page }, provideFixture) => {
    await provideFixture(new DashboardPage(page))
  },
})

export { expect } from "@playwright/test"
