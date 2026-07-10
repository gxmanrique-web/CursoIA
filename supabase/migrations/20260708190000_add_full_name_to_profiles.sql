-- Añade el nombre completo del usuario, necesario para listar escritores por nombre.
alter table public.profiles add column full_name text;
