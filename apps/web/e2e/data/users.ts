/**
 * Datos de prueba para los flujos E2E de autenticación.
 *
 * Estos usuarios NO se crean desde el test: ya existen porque
 * `supabase/seed.sql` los inserta en `auth.users` cada vez que se corre
 * `supabase db reset` (ver `npm run db:reset`) o `supabase start` sobre una
 * base nueva. La contraseña de todos los usuarios sembrados es la misma
 * (documentada en el propio seed.sql).
 *
 * Si esta prueba falla con "credenciales inválidas", lo primero a revisar es
 * si la base local tiene el seed aplicado, no el flujo de login en sí.
 */
export const SEEDED_PASSWORD = "Password123!"

export const SEEDED_USERS = {
  writer: {
    email: "ana@readhub.test",
    password: SEEDED_PASSWORD,
  },
  reader: {
    email: "marta@readhub.test",
    password: SEEDED_PASSWORD,
  },
  admin: {
    email: "admin@readhub.test",
    password: SEEDED_PASSWORD,
  },
} as const

export const INVALID_CREDENTIALS = {
  email: "ana@readhub.test",
  password: "contraseña-incorrecta",
} as const
