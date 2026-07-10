-- Valida las políticas RLS de public.likes.
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

-- Escenario: usuario no autenticado — no puede insertar likes.
set local role anon;
select throws_ok(
  $$insert into public.likes (article_id, user_id) values ('b0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000004')$$,
  '42501'::char(5),
  null,
  'Un usuario anónimo no puede dar like (permission denied)'
);

-- Escenario: usuario autenticado — puede dar like en su propio nombre.
select set_config('request.jwt.claims', json_build_object('sub', 'a0000000-0000-0000-0000-000000000004', 'role', 'authenticated')::text, true);
set local role authenticated;
with inserted as (
  insert into public.likes (article_id, user_id)
  values ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000004')
  returning 1
)
select is((select count(*) from inserted)::int, 1, 'Marta puede dar like a un artículo que aún no había marcado');

-- Restricción de integridad: un usuario no puede duplicar su like sobre el mismo artículo.
select throws_ok(
  $$insert into public.likes (article_id, user_id) values ('b0000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000004')$$,
  '23505'::char(5),
  null,
  'Marta no puede duplicar su like sobre el mismo artículo (UNIQUE)'
);

-- Escenario: usuario sin permisos — no puede dar like suplantando a otro usuario.
select throws_ok(
  $$insert into public.likes (article_id, user_id) values ('b0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000005')$$,
  '42501'::char(5),
  null,
  'Marta no puede dar like en nombre de Carlos'
);

-- Escenario: propietario — puede eliminar su propio like.
with deleted as (
  delete from public.likes
  where article_id = 'b0000000-0000-0000-0000-000000000001' and user_id = 'a0000000-0000-0000-0000-000000000004'
  returning 1
)
select is((select count(*) from deleted)::int, 1, 'Marta puede eliminar su propio like');

-- Escenario: usuario sin permisos — no puede eliminar el like de otro usuario.
with deleted as (
  delete from public.likes
  where article_id = 'b0000000-0000-0000-0000-000000000001' and user_id = 'a0000000-0000-0000-0000-000000000005'
  returning 1
)
select is((select count(*) from deleted)::int, 0, 'Marta no puede eliminar el like de Carlos');

-- Nota de diseño: el spec no pide explícitamente una política de SELECT para
-- likes, pero es necesaria para que DELETE ("solo propietario") sea
-- ejecutable en Postgres (ver nota en supabase/policies.sql). Queda acotada
-- al propio usuario: Marta solo ve su like restante en b...0003, nunca los
-- de Carlos.
select is(
  (select count(*) from public.likes)::int,
  1,
  'Marta solo ve su propio like restante, no los de Carlos'
);

select * from finish();
rollback;
