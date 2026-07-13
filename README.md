# ReadHub — Monorepo

Plataforma de publicación de artículos con un sistema RAG (Retrieval-Augmented
Generation) propio: indexación automática de artículos en pgvector y un
asistente conversacional (Claude) que responde únicamente con el conocimiento
publicado en la plataforma.

Organizado como monorepo (npm workspaces + Turborepo) para poder compartir el
pipeline RAG y el acceso a Supabase entre la app web y futuras aplicaciones
(p. ej. un servidor MCP), sin duplicar lógica.

## Requisitos

- Node.js 20+
- [Supabase CLI](https://supabase.com/docs/guides/cli) (se ejecuta vía `npx supabase`, no requiere instalación global)
- Docker en ejecución (para Supabase local)

## Puesta en marcha

1. Instalar dependencias (un único lockfile para todo el workspace):

   ```bash
   npm install
   ```

2. Copiar las variables de entorno **dentro de `apps/web`** (Next.js solo autocarga env vars desde la carpeta de la propia app):

   ```bash
   cp apps/web/.env.example apps/web/.env.local
   ```

3. Levantar Supabase local (aplica migraciones, políticas RLS, buckets de Storage y `seed.sql`):

   ```bash
   npm run db:start
   ```

   Al finalizar, `supabase start` imprime `API_URL`, `ANON_KEY` y `SERVICE_ROLE_KEY`. Completa `apps/web/.env.local` con esos valores (o con los de un proyecto remoto).

4. Iniciar el servidor de desarrollo:

   ```bash
   npm run dev
   ```

   Abrir [http://localhost:3000](http://localhost:3000). Usuarios de prueba: ver la tabla en [`supabase/seed.sql`](supabase/seed.sql) (contraseña `Password123!` para todos).

## Base de datos y Storage local

```bash
npm run db:start          # levanta Postgres + Auth + Storage + Studio locales y aplica migrations + seed.sql
npm run db:reset          # reaplica migraciones y seed desde cero, y reprovisiona las portadas placeholder
npm run db:seed-storage   # solo reprovisiona las portadas placeholder (ver nota abajo)
npm run test:rls          # corre la suite pgTAP de supabase/tests contra la base local
```

Estos scripts operan sobre `supabase/`, que vive en la **raíz** del monorepo (no dentro de `apps/web`): es infraestructura de base de datos compartida por cualquier app del workspace, no solo la web.

> **Nota sobre las portadas del seed**: `seed.sql` solo puede insertar filas SQL, no subir archivos a Storage. Las rutas de imagen que referencian los artículos de ejemplo (`articles/<id>/cover.jpg`) no existen como objetos reales hasta correr `scripts/seed-storage-placeholders.mjs` (automático dentro de `db:reset`), que sube una imagen placeholder a esas rutas exactas sin modificar `seed.sql` ni ninguna migración.

## Estructura del monorepo

```
readhub/
├── apps/
│   └── web/                    # App Next.js (ver apps/web/README.md)
├── packages/
│   ├── types/                   # Tipos de dominio (Article, Comment, User) + esquema de BD (Database)
│   ├── database/                 # Cliente admin de Supabase (service-role) + constantes de Storage buckets
│   ├── ai/                        # Pipeline RAG completo: embedding, vector-search, context-builder, chat
│   ├── shared/                     # cn/formatDate/formatAuthorLabel + withObservability
│   └── config/                      # Presets de tsconfig compartidos (nextjs.json, node-library.json)
├── supabase/                          # Migraciones, RLS, seed, tests pgTAP — infraestructura de BD del workspace
├── scripts/                            # Utilidades de provisioning (seed de Storage)
├── package.json                         # Raíz del workspace (npm workspaces)
├── tsconfig.base.json                    # compilerOptions compartidas
└── turbo.json                             # Pipeline de tareas (build/dev/lint/check-types)
```

### Paquetes compartidos

- **`@readhub/types`**: única fuente de verdad de tipos de dominio y del
  esquema de base de datos. Sin dependencias de framework.
- **`@readhub/database`**: cliente Supabase con `SUPABASE_SERVICE_ROLE_KEY`
  (bypassa RLS) y las constantes de los buckets de Storage. Es lo que
  cualquier proceso servidor (Route Handler hoy, un futuro servidor MCP
  mañana) necesita para leer/escribir sin pasar por políticas RLS de
  usuario. Los clientes atados a Next.js (browser, SSR, middleware) se
  quedan en `apps/web/lib/supabase/`, no aquí.
- **`@readhub/ai`**: el pipeline RAG completo (`embedding.service` →
  `vector-search.service` → `context-builder.service` → `chat.service`),
  sin dependencias de Next.js — solo Node + `@readhub/database` + los SDKs
  de OpenAI/Anthropic. Es el código que un servidor MCP invocaría como
  Tools.
- **`@readhub/shared`**: utilidades transversales sin acoplamiento de
  dominio — `cn`/`formatDate`/`formatAuthorLabel` (`@readhub/shared`) y
  `withObservability` (`@readhub/shared/observability`), usado tanto por
  los Services de la app web como por el pipeline de `@readhub/ai`.
- **`@readhub/config`**: presets de `tsconfig` para no repetir
  `compilerOptions` en cada app/paquete nuevo.

### Sistema RAG

Pipeline de indexación y recuperación (implementado en `packages/ai`), en capas aisladas — cada Service solo conoce al siguiente, sin lógica duplicada:

```
articles (Postgres) ──▶ embedding.service ──▶ article_embeddings (pgvector, HNSW)
                                                       │
consulta del usuario ──▶ vector-search.service ◀──────┘
                                │
                                ▼
                     context-builder.service (prompt estructurado)
                                │
                                ▼
                        chat.service (Claude) ──▶ respuesta + fuentes citadas
```

- **`embedding.service.ts`**: genera embeddings (OpenAI `text-embedding-3-small`, 1536 dims) a partir de título + resumen + contenido (`.txt`; PDF/DOCX aún no tienen extractor, ver "Limitaciones conocidas" en `apps/web/README.md`).
- **`vector-search.service.ts`**: recuperación semántica vía la función SQL `match_article_embeddings` (`extensions.vector`, índice HNSW, similitud coseno).
- **`context-builder.service.ts`**: selecciona, deduplica y limita los documentos recuperados, y arma el prompt final — no llama a ningún proveedor de IA.
- **`chat.service.ts`**: único punto de contacto con Claude (`@anthropic-ai/sdk`); orquesta los tres servicios anteriores sin duplicar su lógica.
- La indexación se dispara automáticamente al crear/actualizar un artículo (`apps/web/services/article.service.ts` → `POST /api/v1/articles/[id]/embedding`, fire-and-forget) y se elimina automáticamente al borrar el artículo (`ON DELETE CASCADE` en `article_embeddings`).
- Todo el pipeline corre **exclusivamente en el servidor** (requiere `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY` y `ANTHROPIC_API_KEY`) y se expone a la UI únicamente a través de `apps/web/app/api/v1/**`, nunca importado directamente desde componentes cliente.

## Variables de entorno

Ver [`apps/web/.env.example`](apps/web/.env.example):

- `NEXT_PUBLIC_SUPABASE_URL`: URL del proyecto Supabase.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: clave pública (anon) para el cliente de navegador y servidor.
- `SUPABASE_SERVICE_ROLE_KEY`: clave con privilegios elevados. Usada por scripts de administración/seed y por `@readhub/database` (Services del RAG que corren en servidor). Nunca exponer al cliente.
- `OPENAI_API_KEY`: proveedor de embeddings (`@readhub/ai`, `text-embedding-3-small`).
- `ANTHROPIC_API_KEY`: proveedor conversacional (`@readhub/ai`, Claude).

## CI/CD

`.github/workflows/ci.yml` corre en cada `push` y `pull_request`, en dos jobs:

- **`validate`**: `check-types`, `lint`, `test:coverage` (Vitest). No requiere ninguna credencial — los Services se prueban con mocks.
- **`e2e`** (depende de `validate`): construye la app y corre Playwright (`apps/web/e2e/auth.spec.ts`) contra el proyecto Supabase remoto real, autenticando con los usuarios sembrados en `apps/web/e2e/data/users.ts`.

El job `e2e` necesita estos **GitHub Secrets** (Settings → Secrets and variables → Actions), con los mismos valores que `apps/web/.env.local`:

| Secret | Uso |
|---|---|
| `SUPABASE_URL` | `NEXT_PUBLIC_SUPABASE_URL` |
| `SUPABASE_ANON_KEY` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `SUPABASE_SERVICE_ROLE_KEY` | `SUPABASE_SERVICE_ROLE_KEY` (bypassa RLS — tratar como credencial de producción) |

Cargarlos vía `gh secret set <NOMBRE> --body "<valor>"` o desde la UI de GitHub. Sin estos 3 secrets el job `e2e` falla al construir la app (faltan las `NEXT_PUBLIC_*` en build time).

## Limitaciones conocidas

Ver [`apps/web/README.md`](apps/web/README.md#limitaciones-conocidas) — no se modificaron en esta migración (reorganización puramente estructural, sin cambios de comportamiento).
