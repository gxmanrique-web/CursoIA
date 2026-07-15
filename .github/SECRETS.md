# Secrets y variables de GitHub Actions

## Estado actual: `deploy` (y `e2e`, según el proyecto Supabase objetivo) requieren secrets

El workflow ([workflows/ci.yml](workflows/ci.yml)) tiene cuatro jobs: `validate`, `e2e`,
`performance` y `deploy`.

- **Job `validate`** (TypeScript, ESLint, Vitest): los services/hooks se prueban con mocks
  (ver `apps/web/services/*.test.ts`, `packages/ai/src/*.test.ts`) — nunca se llama a
  Supabase, OpenAI ni Anthropic reales, así que no hace falta ninguna credencial.
- **Job `e2e`** (Playwright): autentica contra un proyecto Supabase remoto real usando
  `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` como Repository Secrets
  (ver tabla abajo).
- **Job `performance`** (build + presupuesto de bundle + Lighthouse): no requiere ningún
  secret — solo audita `/login` y `/register`, rutas 100% estáticas que no dependen de
  Supabase en build time.
- **Job `deploy`** (Vercel, solo en `push` a `main`): requiere `VERCEL_TOKEN`,
  `VERCEL_ORG_ID` y `VERCEL_PROJECT_ID` como Repository Secrets.

## Secrets requeridos

| Secret | Job | Uso |
|---|---|---|
| `SUPABASE_URL` | `e2e` | `NEXT_PUBLIC_SUPABASE_URL` |
| `SUPABASE_ANON_KEY` | `e2e` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `SUPABASE_SERVICE_ROLE_KEY` | `e2e` | Bypassa RLS — tratar como credencial de producción |
| `VERCEL_TOKEN` | `deploy` | Autenticación del CLI de Vercel (`vercel pull` / `build` / `deploy`) |
| `VERCEL_ORG_ID` | `deploy` | ID de la organización/cuenta de Vercel |
| `VERCEL_PROJECT_ID` | `deploy` | ID del proyecto de Vercel enlazado a `apps/web` |

Los tres de Vercel se obtienen corriendo `vercel link` una vez en local desde `apps/web`
(genera `.vercel/project.json`, gitignoreado, con `orgId`/`projectId`) o desde
Project Settings → General en el dashboard de Vercel. Cargar todos vía
`gh secret set <NOMBRE> --body "<valor>"` o desde Settings → Secrets and variables → Actions.

Sin los 3 secrets de Supabase, `e2e` falla al construir la app (faltan las `NEXT_PUBLIC_*`
en build time). Sin los 3 de Vercel, `deploy` falla en el primer paso (`vercel pull`).

## Secrets que SÍ habría que agregar si el pipeline se extiende

Estos no se usan hoy en ningún test (ni unitario ni E2E), pero el código de la app sí los
lee en tiempo de ejecución (ver `apps/web/.env.example`). Habría que darlos de alta como
**Repository secrets** únicamente si en el futuro se agrega cobertura de pruebas que
ejercite estos flujos contra proveedores reales:

| Secret | Usado por | Cuándo haría falta en CI |
|---|---|---|
| `OPENAI_API_KEY` | `packages/ai/src/embedding.service.ts` | Si un E2E llega a ejercitar la subida de artículos y su indexación automática (embeddings reales) en vez de mockearlo |
| `ANTHROPIC_API_KEY` | `packages/ai/src/chat.service.ts` | Si un E2E llega a ejercitar `/api/v1/chat` (asistente RAG) contra Claude real en vez de mockearlo |

Si se agregan, en el job `e2e` de `ci.yml` se inyectarían así (nunca hasta ahora, ni en este
cambio):

```yaml
- name: Run Playwright E2E
  env:
    CI: true
    OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
  run: npm run test:e2e
```

## Si en algún momento se apunta el pipeline a un proyecto Supabase remoto

No es el diseño actual (y no se recomienda: el E2E depende de `supabase/seed.sql`, que solo
se aplica automáticamente en instancias locales) pero si se decidiera, los tres secrets
equivalentes serían:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

`NEXT_PUBLIC_*` puede vivir como **Variable** (no-secreta, ya que termina expuesta al
navegador de todos modos); `SUPABASE_SERVICE_ROLE_KEY` debe ser siempre **Secret**
(evade RLS).

## Variables que nunca deben ir en GitHub Secrets

- `CI`: la define GitHub Actions automáticamente en cada runner; no configurar manualmente.
- Las claves de demo local (`ANON_KEY`/`SERVICE_ROLE_KEY` con `iss: supabase-demo`) que
  imprime `supabase status`: son públicas por diseño del propio Supabase CLI.
