-- FAVORITES: artículos guardados por un usuario. Estructura preparada para fases posteriores.
create table public.favorites (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.favorites is 'Artículos guardados por un usuario.';

alter table public.favorites enable row level security;
