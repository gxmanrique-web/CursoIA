-- Valida las políticas RLS de public.articles.
-- Ana (writer, autora de b...0001 público y b...0002 privado) y
-- Luis (writer, autor de b...0003 público y b...0004 privado). Ver supabase/seed.sql.
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

-- Escenario: usuario no autenticado — solo ve artículos públicos.
set local role anon;
select is(
  (select count(*) from public.articles)::int, 2,
  'Un usuario anónimo solo ve los artículos públicos (2)'
);

-- Escenario: autor del recurso — además de los públicos, ve su propio
-- borrador privado (b...0002), pero no el de Luis (b...0004).
select set_config('request.jwt.claims', json_build_object('sub', 'a0000000-0000-0000-0000-000000000002', 'role', 'authenticated')::text, true);
set local role authenticated;
select is(
  (select count(*) from public.articles)::int, 3,
  'Ana ve los 2 públicos más su propio borrador privado (3), no el de Luis'
);

-- Escenario: autor del recurso — puede editar su propio artículo PRIVADO.
-- (En Postgres, UPDATE con RLS exige que la fila sea visible por alguna
-- política de SELECT; sin "articles_select_own" esto fallaría con 0 filas.)
with updated as (
  update public.articles set title = 'Borrador editado por su autora'
  where id = 'b0000000-0000-0000-0000-000000000002' returning 1
)
select is((select count(*) from updated)::int, 1, 'Ana puede editar su propio borrador privado');

-- Escenario: autor del recurso — puede publicar un artículo propio.
with inserted as (
  insert into public.articles (author_id, title, document_path, is_public)
  values ('a0000000-0000-0000-0000-000000000002', 'Articulo de prueba', 'd.md', true)
  returning 1
)
select is((select count(*) from inserted)::int, 1, 'Ana puede publicar un artículo propio');

-- Escenario: usuario sin permisos — no puede suplantar la autoría de otro usuario.
select throws_ok(
  $$insert into public.articles (author_id, title, document_path) values ('a0000000-0000-0000-0000-000000000003','spoof','d.md')$$,
  '42501'::char(5),
  null,
  'Ana no puede publicar un artículo a nombre de Luis'
);

-- Escenario: autor del recurso — puede editar su propio artículo público.
with updated as (
  update public.articles set title = 'Editado por autor'
  where id = 'b0000000-0000-0000-0000-000000000001' returning 1
)
select is((select count(*) from updated)::int, 1, 'Ana puede editar su propio artículo público');

-- Escenario: usuario sin permisos — no puede editar el artículo de otro autor.
with updated as (
  update public.articles set title = 'hackeado'
  where id = 'b0000000-0000-0000-0000-000000000003' returning 1
)
select is((select count(*) from updated)::int, 0, 'Ana no puede editar el artículo de Luis');

-- Escenario: usuario sin permisos — no puede eliminar el artículo de otro autor.
with deleted as (
  delete from public.articles where id = 'b0000000-0000-0000-0000-000000000003' returning 1
)
select is((select count(*) from deleted)::int, 0, 'Ana no puede eliminar el artículo de Luis');

-- Escenario: autor del recurso — puede eliminar su propio artículo.
with deleted as (
  delete from public.articles where id = 'b0000000-0000-0000-0000-000000000001' returning 1
)
select is((select count(*) from deleted)::int, 1, 'Ana puede eliminar su propio artículo');

select * from finish();
rollback;
