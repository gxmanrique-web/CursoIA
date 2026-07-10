-- ============================================================================
-- ReadHub — Esquema relacional completo (referencia consolidada).
-- Contenido idéntico a la unión ordenada de los archivos en supabase/migrations/.
-- La fuente de verdad para desplegar la base de datos son las migraciones;
-- este archivo existe únicamente como documento de consulta.
-- ============================================================================

-- Extensiones requeridas por el esquema (generación de UUID).
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- PROFILES: relación 1:1 con auth.users. El id es a la vez PK y FK.
-- ----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  birth_date date,
  phone text,
  role text not null default 'reader' check (role in ('reader', 'writer', 'admin')),
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'Perfil de cada usuario registrado. 1:1 con auth.users.';

alter table public.profiles enable row level security;

-- Aprovisiona automáticamente el perfil cuando Supabase Auth crea un usuario,
-- para que la relación 1:1 con auth.users se mantenga siempre consistente.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ----------------------------------------------------------------------------
-- ARTICLES: artículos publicados por un usuario (profiles).
-- ----------------------------------------------------------------------------
create table public.articles (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  summary text,
  document_path text not null,
  image_path text,
  created_at timestamptz not null default now(),
  is_public boolean not null default true
);

comment on table public.articles is 'Artículos publicados por los usuarios.';

alter table public.articles enable row level security;

-- ----------------------------------------------------------------------------
-- VIEWS: cada apertura de un artículo es un evento independiente (sin contador).
-- ----------------------------------------------------------------------------
create table public.views (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  viewed_at timestamptz not null default now()
);

comment on table public.views is 'Registro de cada visualización de un artículo.';

alter table public.views enable row level security;

-- ----------------------------------------------------------------------------
-- LIKES: un usuario solo puede registrar un like por artículo.
-- ----------------------------------------------------------------------------
create table public.likes (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (article_id, user_id)
);

comment on table public.likes is '"Me gusta" de un usuario sobre un artículo.';

alter table public.likes enable row level security;

-- ----------------------------------------------------------------------------
-- COMMENTS: comentarios realizados sobre un artículo.
-- ----------------------------------------------------------------------------
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  comment text not null,
  created_at timestamptz not null default now()
);

comment on table public.comments is 'Comentarios de los usuarios sobre un artículo.';

alter table public.comments enable row level security;

-- ----------------------------------------------------------------------------
-- FAVORITES: artículos guardados por un usuario. Estructura preparada para fases posteriores.
-- ----------------------------------------------------------------------------
create table public.favorites (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.favorites is 'Artículos guardados por un usuario.';

alter table public.favorites enable row level security;

-- ----------------------------------------------------------------------------
-- Índices recomendados para las consultas más frecuentes (filtrado por artículo/autor).
-- ----------------------------------------------------------------------------
create index articles_author_id_idx on public.articles (author_id);
create index views_article_id_idx on public.views (article_id);
create index likes_article_id_idx on public.likes (article_id);
create index comments_article_id_idx on public.comments (article_id);
create index favorites_article_id_idx on public.favorites (article_id);
