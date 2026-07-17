-- Infraestructura vectorial para el asistente RAG (Voyage AI + Groq).
-- Migración puramente aditiva: no toca ninguna tabla, política ni función existente.

create extension if not exists "vector";

-- 1:N con articles: un artículo puede producir varios fragmentos vectorizados.
-- Granularidad de fragmento (no de artículo completo) para poder citar la porción
-- exacta que sustenta una respuesta, y para no diluir la similitud de un documento
-- largo en un único vector que promedia temas distintos.
create table public.article_chunks (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles (id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  -- 1024 = dimensión de salida de voyage-4. Este número debe coincidir
  -- exactamente con la constante del cliente de embeddings
  -- (packages/ai/src/providers/voyage.ts); si se cambia de modelo con otra
  -- dimensión, hace falta una migración de columna además del cambio de cliente.
  embedding vector(1024) not null,
  created_at timestamptz not null default now(),
  -- Reindexar un artículo borra e inserta de nuevo sus fragmentos (idempotente);
  -- esta restricción evita que una carrera o un reintento deje duplicados.
  unique (article_id, chunk_index)
);

-- HNSW y no IVFFlat: IVFFlat necesita entrenarse (k-means) sobre filas ya
-- existentes y su calidad es errática si se crea sobre una tabla vacía, que es
-- justo el estado inicial aquí. HNSW se construye de forma incremental al
-- insertar, sin depender de datos previos para producir buckets razonables.
create index article_chunks_embedding_hnsw_idx
  on public.article_chunks
  using hnsw (embedding vector_cosine_ops);

-- Acelera el delete+insert de reindexado y el cascade al borrar un artículo.
create index article_chunks_article_id_idx
  on public.article_chunks (article_id);

revoke all on public.article_chunks from anon, authenticated;

-- Deny-by-default, sin políticas: coincide con la postura del resto del
-- esquema (todas las demás tablas tienen RLS activo). No abre ningún acceso
-- nuevo (los GRANTs de tabla ya están revocados arriba); la función
-- match_article_chunks sigue funcionando igual porque SECURITY DEFINER
-- corre con los privilegios de la dueña de la función (= dueña de la
-- tabla), que bypassa RLS por defecto.
alter table public.article_chunks enable row level security;

-- Única puerta de lectura del índice vectorial. La RLS de fila no protege esta
-- ruta: la función corre con los privilegios de su dueño (security definer),
-- así que debe filtrar ella misma is_public = true o un borrador ajeno se
-- volvería recuperable vía búsqueda semántica aunque nunca aparezca listado.
create function public.match_article_chunks(
  query_embedding vector(1024),
  match_threshold float,
  match_count int
)
returns table (
  chunk_id uuid,
  article_id uuid,
  chunk_index integer,
  content text,
  title text,
  summary text,
  similarity float
)
language sql
stable
security definer
-- pgvector vive en el esquema "extensions" en proyectos Supabase (no en
-- public); sin incluirlo aquí, el operador <=> no resuelve dentro de una
-- función SECURITY DEFINER con search_path acotado.
set search_path = public, extensions
as $$
  select
    c.id as chunk_id,
    c.article_id,
    c.chunk_index,
    c.content,
    a.title,
    a.summary,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.article_chunks c
  join public.articles a on a.id = c.article_id
  where a.is_public = true
    -- El umbral se aplica sobre la distancia, no sobre la similitud derivada,
    -- por la misma razón que el ORDER BY: mantiene la comparación en la métrica
    -- nativa del índice.
    and c.embedding <=> query_embedding < 1 - match_threshold
  -- <=> (operador de distancia), NUNCA la columna de similitud calculada: con
  -- similitud el resultado es idéntico pero el planificador deja de poder usar
  -- el índice HNSW y hace un escaneo completo. Con 10 artículos no se nota;
  -- con 10.000 sí.
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

revoke execute on function public.match_article_chunks(vector, float, int) from public, anon;
grant execute on function public.match_article_chunks(vector, float, int) to authenticated;
