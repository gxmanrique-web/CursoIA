-- COMMENTS: comentarios realizados sobre un artículo.
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  comment text not null,
  created_at timestamptz not null default now()
);

comment on table public.comments is 'Comentarios de los usuarios sobre un artículo.';

alter table public.comments enable row level security;
