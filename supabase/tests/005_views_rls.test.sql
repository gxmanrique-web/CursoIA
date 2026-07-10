-- Valida las políticas RLS de public.views.
begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

-- Escenario: usuario no autenticado — no puede registrar visualizaciones.
set local role anon;
select throws_ok(
  $$insert into public.views (article_id, user_id) values ('b0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000004')$$,
  '42501'::char(5),
  null,
  'Un usuario anónimo no puede registrar una visualización'
);

-- Escenario: usuario autenticado — puede registrar su propia visualización.
select set_config('request.jwt.claims', json_build_object('sub', 'a0000000-0000-0000-0000-000000000005', 'role', 'authenticated')::text, true);
set local role authenticated;
with inserted as (
  insert into public.views (article_id, user_id)
  values ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000005')
  returning 1
)
select is((select count(*) from inserted)::int, 1, 'Carlos puede registrar su propia visualización');

-- Escenario: usuario sin permisos — no puede registrar una visualización suplantando a otro usuario.
select throws_ok(
  $$insert into public.views (article_id, user_id) values ('b0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000004')$$,
  '42501'::char(5),
  null,
  'Carlos no puede registrar una visualización en nombre de Marta'
);

-- Escenario: autor del recurso — puede ver las visualizaciones de su propio artículo.
select set_config('request.jwt.claims', json_build_object('sub', 'a0000000-0000-0000-0000-000000000002', 'role', 'authenticated')::text, true);
set local role authenticated;
select ok(
  (select count(*) from public.views where article_id = 'b0000000-0000-0000-0000-000000000001') > 0,
  'Ana (autora del artículo) puede ver sus visualizaciones'
);

-- Escenario: usuario sin permisos — no puede ver las visualizaciones de un artículo ajeno,
-- ni siquiera la que él mismo generó (la política exige ser admin o autor del artículo).
select set_config('request.jwt.claims', json_build_object('sub', 'a0000000-0000-0000-0000-000000000005', 'role', 'authenticated')::text, true);
set local role authenticated;
select is(
  (select count(*) from public.views where article_id = 'b0000000-0000-0000-0000-000000000001')::int,
  0,
  'Carlos no puede ver las visualizaciones del artículo de Ana, aunque una sea suya'
);

-- Escenario: administrador — puede ver las visualizaciones de cualquier artículo.
select set_config('request.jwt.claims', json_build_object('sub', 'a0000000-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);
set local role authenticated;
select ok(
  (select count(*) from public.views where article_id = 'b0000000-0000-0000-0000-000000000001') > 0,
  'El admin puede ver las visualizaciones de cualquier artículo'
);

select * from finish();
rollback;
