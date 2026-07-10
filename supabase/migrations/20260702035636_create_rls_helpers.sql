-- Helper para las políticas RLS: evita repetir la subconsulta a profiles
-- y evita depender de la RLS de profiles al evaluarse dentro de otra política.
create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;
