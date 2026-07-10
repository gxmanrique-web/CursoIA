-- Valida las políticas RLS de public.comments.
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

-- Escenario: usuario no autenticado — puede leer todos los comentarios.
set local role anon;
select is((select count(*) from public.comments)::int, 3, 'Un usuario anónimo puede leer todos los comentarios');

-- Escenario: usuario autenticado — puede comentar en su propio nombre.
select set_config('request.jwt.claims', json_build_object('sub', 'a0000000-0000-0000-0000-000000000004', 'role', 'authenticated')::text, true);
set local role authenticated;
with inserted as (
  insert into public.comments (article_id, user_id, comment)
  values ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 'comentario de prueba')
  returning 1
)
select is((select count(*) from inserted)::int, 1, 'Marta puede comentar en su propio nombre');

-- Escenario: usuario sin permisos — no puede comentar suplantando a otro usuario.
select throws_ok(
  $$insert into public.comments (article_id, user_id, comment) values ('b0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000005','spoof')$$,
  '42501'::char(5),
  null,
  'Marta no puede comentar en nombre de Carlos'
);

-- Escenario: autor del recurso — puede editar su propio comentario
-- (el recién insertado arriba; se identifica por su texto para no
-- confundirlo con el comentario que Marta ya tenía sembrado en el mismo artículo).
with updated as (
  update public.comments set comment = 'editado'
  where comment = 'comentario de prueba' and user_id = 'a0000000-0000-0000-0000-000000000004'
  returning 1
)
select is((select count(*) from updated)::int, 1, 'Marta puede editar su propio comentario');

-- Escenario: usuario sin permisos — no puede editar un comentario ajeno.
with updated as (
  update public.comments set comment = 'hackeado'
  where article_id = 'b0000000-0000-0000-0000-000000000001' and user_id = 'a0000000-0000-0000-0000-000000000005'
  returning 1
)
select is((select count(*) from updated)::int, 0, 'Marta no puede editar el comentario de Carlos');

-- Escenario: usuario sin permisos — no puede eliminar un comentario ajeno.
with deleted as (
  delete from public.comments
  where article_id = 'b0000000-0000-0000-0000-000000000001' and user_id = 'a0000000-0000-0000-0000-000000000005'
  returning 1
)
select is((select count(*) from deleted)::int, 0, 'Marta no puede eliminar el comentario de Carlos');

-- Escenario: administrador — puede eliminar cualquier comentario.
select set_config('request.jwt.claims', json_build_object('sub', 'a0000000-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);
set local role authenticated;
with deleted as (
  delete from public.comments
  where article_id = 'b0000000-0000-0000-0000-000000000001' and user_id = 'a0000000-0000-0000-0000-000000000005'
  returning 1
)
select is((select count(*) from deleted)::int, 1, 'El admin puede eliminar el comentario de Carlos');

select * from finish();
rollback;
