-- Valida las políticas RLS de public.profiles.
-- Usuarios de referencia (ver supabase/seed.sql): Marta (reader) y Carlos (reader).
begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

-- Escenario: autor del recurso — un usuario ve su propio perfil.
select set_config('request.jwt.claims', json_build_object('sub', 'a0000000-0000-0000-0000-000000000004', 'role', 'authenticated')::text, true);
set local role authenticated;
select is(
  (select count(*) from public.profiles where id = 'a0000000-0000-0000-0000-000000000004')::int,
  1,
  'Marta puede ver su propio perfil'
);

-- Escenario: usuario sin permisos — no puede ver el perfil de otro usuario.
select is(
  (select count(*) from public.profiles where id = 'a0000000-0000-0000-0000-000000000005')::int,
  0,
  'Marta no puede ver el perfil de Carlos'
);

-- Escenario: usuario no autenticado — sin GRANT de SELECT sobre profiles.
set local role anon;
select throws_ok(
  $$select * from public.profiles$$,
  '42501'::char(5),
  null,
  'Un usuario anónimo no puede leer profiles (permission denied)'
);

-- Escenario: autor del recurso — puede modificar su propio perfil.
select set_config('request.jwt.claims', json_build_object('sub', 'a0000000-0000-0000-0000-000000000004', 'role', 'authenticated')::text, true);
set local role authenticated;
with updated as (
  update public.profiles set phone = '+34600000099' where id = 'a0000000-0000-0000-0000-000000000004' returning 1
)
select is((select count(*) from updated)::int, 1, 'Marta puede actualizar su propio perfil');

-- Escenario: usuario sin permisos — no puede modificar el perfil de otro usuario.
with updated as (
  update public.profiles set phone = '+34600000098' where id = 'a0000000-0000-0000-0000-000000000005' returning 1
)
select is((select count(*) from updated)::int, 0, 'Marta no puede actualizar el perfil de Carlos');

select * from finish();
rollback;
