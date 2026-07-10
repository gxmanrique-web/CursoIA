# ReadHub — apps/web

Plataforma de publicación de artículos. Next.js 15 (App Router), React 19, TypeScript, TailwindCSS, Shadcn/UI y Supabase.

> Estado: MVP funcional completo — autenticación, listado, publicación, detalle de artículo, comentarios y likes, integrados con Supabase (Auth, Postgres, Storage). Incorpora además un sistema RAG (Retrieval-Augmented Generation): indexación automática de artículos en pgvector y un asistente conversacional (Claude) que responde únicamente con el conocimiento publicado en la plataforma.
>
> Esta app vive dentro del monorepo de ReadHub (ver [`README.md`](../../README.md) en la raíz) — el pipeline RAG y el acceso a Supabase que antes vivían en `services/`/`lib/` de esta misma carpeta ahora son paquetes compartidos (`@readhub/ai`, `@readhub/database`, `@readhub/shared`, `@readhub/types`).

## Requisitos

- Node.js 20+
- [Supabase CLI](https://supabase.com/docs/guides/cli) (se ejecuta vía `npx supabase`, no requiere instalación global)
- Docker en ejecución (para Supabase local)

## Puesta en marcha

Todos los comandos de instalación y base de datos se ejecutan desde la **raíz del monorepo** (ver [`README.md`](../../README.md)), no desde `apps/web`. Solo el servidor de desarrollo se puede lanzar apuntando a este workspace:

```bash
npm run dev -w apps/web
```

Abrir [http://localhost:3000](http://localhost:3000).

Usuarios de prueba: ver la tabla en [`supabase/seed.sql`](../../supabase/seed.sql) (contraseña `Password123!` para todos).

Variables de entorno de esta app: copiar [`.env.example`](.env.example) a `.env.local` **dentro de `apps/web`** (Next.js solo autocarga env vars desde la carpeta de la propia app).

## Estructura de esta app

```
apps/web/
├── app/
│   ├── (auth)/              # login, register — layout sin Navbar
│   ├── (dashboard)/         # home, upload, article/[id], assistant — layout con Navbar, protegido
│   ├── api/v1/
│   │   ├── articles/[id]/embedding/  # POST — dispara la indexación (embedding) de un artículo, delega en @readhub/ai
│   │   └── chat/                      # POST — único punto de entrada del asistente RAG, delega en @readhub/ai
│   └── globals.css          # design tokens (colores, tipografía, radios, sombras)
├── components/               # ui/, navigation/, forms/, cards/, articles/, comments/, chat/, dialogs/, states/
├── hooks/                    # useAuth, useArticles, useComments, useLikes, useUpload, useArticleDocument, useChat
├── services/                  # article.service, auth.service, comment.service, storage.service
│                               # (lógica de negocio de ESTA app: usan el cliente browser de Supabase y,
│                               # en article.service, un fetch relativo a app/api/v1/** — no portable fuera de Next.js)
├── lib/supabase/               # client.ts (browser), server.ts (SSR/getServerUser), middleware.ts (sesión)
│                               # — utilidades atadas al ciclo de vida de Next.js; el cliente admin vive en @readhub/database
└── middleware.ts                  # protección de rutas + refresco de sesión
```

### Sistema RAG

El pipeline de indexación y recuperación (`embedding` → `vector-search` → `context-builder` → `chat`) vive en el paquete compartido [`@readhub/ai`](../../packages/ai) — ver su documentación para el detalle de cada Service. Esta app solo lo consume desde dos Route Handlers (`app/api/v1/chat`, `app/api/v1/articles/[id]/embedding`); ningún componente cliente lo importa directamente. `article.service.ts` dispara la indexación con un `fetch("/api/v1/articles/[id]/embedding")` fire-and-forget tras crear/actualizar un artículo.

## Variables de entorno

Ver [`.env.example`](.env.example):

- `NEXT_PUBLIC_SUPABASE_URL`: URL del proyecto Supabase.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: clave pública (anon) para el cliente de navegador y servidor.
- `SUPABASE_SERVICE_ROLE_KEY`: clave con privilegios elevados. Usada por scripts de administración/seed y por el cliente admin de `@readhub/database` (Services del RAG que corren en servidor). Nunca exponer al cliente.
- `OPENAI_API_KEY`: proveedor de embeddings (`@readhub/ai`, `text-embedding-3-small`).
- `ANTHROPIC_API_KEY`: proveedor conversacional (`@readhub/ai`, Claude).

## Limitaciones conocidas

- **Conteos de likes/vistas**: las políticas RLS heredadas (`likes_select_own`, `views_select_admin_or_author`) solo permiten ver las filas propias, así que el conteo mostrado en artículos ajenos no refleja el total real. Corregirlo requiere una función `security definer` (RPC) o ampliar esas políticas — pendiente de decisión.
- **Nombre de autor/comentarista**: `profiles` no tiene columna de nombre/email pública y su RLS impide leer el perfil de otro usuario; se muestra un identificador corto derivado del `user_id`.
- **API REST versionada** (`/api/v1/...`): parcialmente implementada — solo existen los dos Route Handlers que requiere el sistema RAG (`articles/[id]/embedding`, `chat`), necesarios porque esos Services corren en servidor con secretos que no pueden llegar al navegador. El resto de la aplicación (artículos, comentarios, likes, auth) sigue interactuando con Supabase directamente desde la capa `services/` consumida por Custom Hooks, sin Route Handlers.
- **Extracción de texto de documentos**: el RAG solo vectoriza el contenido completo de documentos `.txt`. Para PDF/DOCX, el embedding se genera únicamente con título + resumen (no hay extractor de texto implementado); esto degrada la calidad de la búsqueda semántica para esos artículos.
- **Streaming del asistente**: la respuesta de Claude no se transmite en streaming real desde el backend (`chat.service.ts` espera la respuesta completa); la interfaz simula el renderizado progresivo revelando el texto ya recibido en el cliente.
- **Autorización de los endpoints del RAG**: `POST /api/v1/articles/[id]/embedding` y `POST /api/v1/chat` solo exigen una sesión válida, no verifican que el usuario sea el autor del artículo indexado. Riesgo bajo (costo de API por regeneración redundante, sin fuga de datos) — candidato a endurecer si el proyecto avanza más allá del laboratorio.
