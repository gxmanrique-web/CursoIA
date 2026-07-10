-- ARTICLES: artículos publicados por un usuario (profiles).
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
