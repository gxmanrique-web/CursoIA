# ReadHub

Plataforma de publicación de artículos. Next.js 15 (App Router), React 19, TypeScript, TailwindCSS, Shadcn/UI y Supabase.

> Estado: MVP funcional completo — autenticación, listado, publicación, detalle de artículo, comentarios y likes, integrados con Supabase (Auth, Postgres, Storage). Incorpora además un sistema RAG (Retrieval-Augmented Generation): indexación automática de artículos en pgvector y un asistente conversacional (Claude) que responde únicamente con el conocimiento publicado en la plataforma.

## Requisitos

- Node.js 20+
- [Supabase CLI](https://supabase.com/docs/guides/cli) (se ejecuta vía `npx supabase`, no requiere instalación global)
- Docker en ejecución (para Supabase local)

## Puesta en marcha

1. Instalar dependencias:

   ```bash
   npm install
   ```

2. Copiar las variables de entorno:

   ```bash
   cp .env.example .env.local
   ```

3. Levantar Supabase local (aplica migraciones, políticas RLS, buckets de Storage y `seed.sql`):

   ```bash
   npm run db:start
   ```

   Al finalizar, `supabase start` imprime `API_URL`, `ANON_KEY` y `SERVICE_ROLE_KEY`. Completa `.env.local` con esos valores (o con los de un proyecto remoto).

4. Iniciar el servidor de desarrollo:

   ```bash
   npm run dev
   ```

   Abrir [http://localhost:3000](http://localhost:3000).

   Usuarios de prueba: ver la tabla en [`supabase/seed.sql`](supabase/seed.sql) (contraseña `Password123!` para todos).

## Base de datos y Storage local

```bash
npm run db:start          # levanta Postgres + Auth + Storage + Studio locales y aplica migrations + seed.sql
npm run db:reset          # reaplica migraciones y seed desde cero, y reprovisiona las portadas placeholder
npm run db:seed-storage   # solo reprovisiona las portadas placeholder (ver nota abajo)
npm run test:rls          # corre la suite pgTAP de supabase/tests contra la base local
```

> **Nota sobre las portadas del seed**: `seed.sql` solo puede insertar filas SQL, no subir archivos a Storage. Las rutas de imagen que referencian los artículos de ejemplo (`articles/<id>/cover.jpg`) no existen como objetos reales hasta correr `scripts/seed-storage-placeholders.mjs` (automático dentro de `db:reset`), que sube una imagen placeholder a esas rutas exactas sin modificar `seed.sql` ni ninguna migración.

## Estructura del proyecto

```
readhub/
├── app/
│   ├── (auth)/              # login, register — layout sin Navbar
│   ├── (dashboard)/         # home, upload, article/[id], assistant — layout con Navbar, protegido
│   ├── api/v1/
│   │   ├── articles/[id]/embedding/  # POST — dispara la indexación (embedding) de un artículo
│   │   └── chat/                      # POST — único punto de entrada del asistente RAG
│   └── globals.css          # design tokens (colores, tipografía, radios, sombras)
├── components/
│   ├── ui/                  # primitivas Shadcn/UI (button, input, card, dialog, ...)
│   ├── navigation/          # Navbar, Logo, NavLink
│   ├── forms/                # FormField, FormActions, FileInput
│   ├── cards/                # ArticleCard y su skeleton
│   ├── articles/             # ArticleCover, ArticleMeta, ArticleHeader, LikeButton
│   ├── comments/             # CommentItem, CommentList, CommentForm
│   ├── chat/                  # ChatWindow, ChatMessage, ChatInput, ChatSources — interfaz del asistente RAG
│   ├── dialogs/               # ConfirmDialog
│   └── states/                # LoadingState, EmptyState, ErrorState
├── hooks/                    # useAuth, useArticles, useComments, useLikes, useUpload, useArticleDocument, useChat
├── services/                  # article.service, auth.service, comment.service, storage.service
│                               # embedding.service, vector-search.service, context-builder.service, chat.service
│                               # (única capa que llama a Supabase / a los proveedores de IA)
├── lib/supabase/               # clientes de Supabase (browser, server, middleware, admin)
├── types/                      # tipos TypeScript (entidades y esquema de BD)
├── scripts/                     # utilidades de provisioning (seed de Storage)
├── supabase/
│   ├── migrations/              # migraciones SQL (incluye buckets de Storage y la infraestructura pgvector)
│   ├── seed.sql                  # datos de prueba (no modificado)
│   └── tests/                     # suite pgTAP de validación de políticas RLS
└── middleware.ts                  # protección de rutas + refresco de sesión
```

### Sistema RAG

Pipeline de indexación y recuperación, en capas aisladas (cada Service solo conoce al siguiente, sin lógica duplicada):

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

- **`embedding.service.ts`**: genera embeddings (OpenAI `text-embedding-3-small`, 1536 dims) a partir de título + resumen + contenido (`.txt`; PDF/DOCX aún no tienen extractor, ver "Limitaciones conocidas").
- **`vector-search.service.ts`**: recuperación semántica vía la función SQL `match_article_embeddings` (`extensions.vector`, índice HNSW, similitud coseno).
- **`context-builder.service.ts`**: selecciona, deduplica y limita los documentos recuperados, y arma el prompt final — no llama a ningún proveedor de IA.
- **`chat.service.ts`**: único punto de contacto con Claude (`@anthropic-ai/sdk`); orquesta los tres servicios anteriores sin duplicar su lógica.
- La indexación se dispara automáticamente al crear/actualizar un artículo (`article.service.ts` → `POST /api/v1/articles/[id]/embedding`, fire-and-forget) y se elimina automáticamente al borrar el artículo (`ON DELETE CASCADE` en `article_embeddings`).
- Todos estos Services corren **exclusivamente en el servidor** (requieren `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY` y `ANTHROPIC_API_KEY`) y se exponen a la UI únicamente a través de `app/api/v1/**`, nunca importados directamente desde componentes cliente.

## Variables de entorno

Ver [`.env.example`](.env.example):

- `NEXT_PUBLIC_SUPABASE_URL`: URL del proyecto Supabase.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: clave pública (anon) para el cliente de navegador y servidor.
- `SUPABASE_SERVICE_ROLE_KEY`: clave con privilegios elevados. Usada por scripts de administración/seed y por `lib/supabase/admin.ts` (Services del RAG que corren en servidor). Nunca exponer al cliente.
- `OPENAI_API_KEY`: proveedor de embeddings (`embedding.service.ts`, `text-embedding-3-small`).
- `ANTHROPIC_API_KEY`: proveedor conversacional (`chat.service.ts`, Claude).

## Limitaciones conocidas

- **Conteos de likes/vistas**: las políticas RLS heredadas (`likes_select_own`, `views_select_admin_or_author`) solo permiten ver las filas propias, así que el conteo mostrado en artículos ajenos no refleja el total real. Corregirlo requiere una función `security definer` (RPC) o ampliar esas políticas — pendiente de decisión.
- **Nombre de autor/comentarista**: `profiles` no tiene columna de nombre/email pública y su RLS impide leer el perfil de otro usuario; se muestra un identificador corto derivado del `user_id`.
- **API REST versionada** (`/api/v1/...`): parcialmente implementada — solo existen los dos Route Handlers que requiere el sistema RAG (`articles/[id]/embedding`, `chat`), necesarios porque esos Services corren en servidor con secretos que no pueden llegar al navegador. El resto de la aplicación (artículos, comentarios, likes, auth) sigue interactuando con Supabase directamente desde la capa `services/` consumida por Custom Hooks, sin Route Handlers.
- **Extracción de texto de documentos**: el RAG solo vectoriza el contenido completo de documentos `.txt`. Para PDF/DOCX, el embedding se genera únicamente con título + resumen (no hay extractor de texto implementado); esto degrada la calidad de la búsqueda semántica para esos artículos.
- **Streaming del asistente**: la respuesta de Claude no se transmite en streaming real desde el backend (`chat.service.ts` espera la respuesta completa); la interfaz simula el renderizado progresivo revelando el texto ya recibido en el cliente.
- **Autorización de los endpoints del RAG**: `POST /api/v1/articles/[id]/embedding` y `POST /api/v1/chat` solo exigen una sesión válida, no verifican que el usuario sea el autor del artículo indexado. Riesgo bajo (costo de API por regeneración redundante, sin fuga de datos) — candidato a endurecer si el proyecto avanza más allá del laboratorio.
