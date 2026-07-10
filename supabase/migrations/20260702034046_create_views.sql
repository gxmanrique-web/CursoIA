-- VIEWS: cada apertura de un artículo es un evento independiente (sin contador).
create table public.views (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  viewed_at timestamptz not null default now()
);

comment on table public.views is 'Registro de cada visualización de un artículo.';

alter table public.views enable row level security;
