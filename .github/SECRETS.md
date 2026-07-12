# Secrets y variables de GitHub Actions

## Estado actual: no se requiere configurar ningún secret

El workflow ([workflows/ci.yml](workflows/ci.yml)) está diseñado deliberadamente para no
depender de ningún secret del repositorio:

- **Job `validate`** (TypeScript, ESLint, Vitest): los services/hooks se prueban con mocks
  (ver `apps/web/services/*.test.ts`, `packages/ai/src/*.test.ts`) — nunca se llama a
  Supabase, OpenAI ni Anthropic reales, así que no hace falta ninguna credencial.
- **Job `e2e`** (Playwright): levanta un Supabase **local** con `supabase start` dentro del
  propio runner y genera `apps/web/.env.local` a partir de `supabase status -o env`. Esas
  claves son las claves de demo fijas que trae el CLI de Supabase (`ANON_KEY`/`SERVICE_ROLE_KEY`
  con `iss: "supabase-demo"`) — públicas, documentadas por el propio proyecto Supabase, sin
  ningún valor fuera de `127.0.0.1`. No es necesario ni deseable guardarlas como secret.

**Por lo tanto: en Settings → Secrets and variables → Actions no hay que crear nada para que
`ci.yml` funcione tal como está.**

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
