-- PROFILES: relación 1:1 con auth.users. El id es a la vez PK y FK.
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
