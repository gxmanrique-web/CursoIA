-- Valida las políticas RLS de public.favorites.
begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

-- Escenario: usuario no autenticado — no puede leer favoritos.
set local role anon;
select throws_ok(
  $$select * from public.favorites$$,
  '42501'::char(5),
  null,
  'Un usuario anónimo no puede leer favorites'
);

-- Escenario: propietario — solo ve sus propios favoritos, no los de otros usuarios.
select set_config('request.jwt.claims', json_build_object('sub', 'a0000000-0000-0000-0000-000000000004', 'role', 'authenticated')::text, true);
set local role authenticated;
select is(
  (select count(*) from public.favorites)::int, 1,
  'Marta solo ve su propio favorito, no el de Carlos'
);

-- Escenario: usuario autenticado — puede guardar un artículo como favorito propio.
with inserted as (
  insert into public.favorites (article_id, user_id)
  values ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000004')
  returning 1
)
select is((select count(*) from inserted)::int, 1, 'Marta puede agregar un nuevo favorito propio');

-- Escenario: usuario sin permisos — no puede crear un favorito suplantando a otro usuario.
select throws_ok(
  $$insert into public.favorites (article_id, user_id) values ('b0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000005')$$,
  '42501'::char(5),
  null,
  'Marta no puede crear un favorito en nombre de Carlos'
);

-- Escenario: propietario — puede eliminar su propio favorito.
with deleted as (
  delete from public.favorites
  where article_id = 'b0000000-0000-0000-0000-000000000003' and user_id = 'a0000000-0000-0000-0000-000000000004'
  returning 1
)
select is((select count(*) from deleted)::int, 1, 'Marta puede eliminar su propio favorito');

-- Escenario: usuario sin permisos — no puede eliminar el favorito de otro usuario.
with deleted as (
  delete from public.favorites
  where article_id = 'b0000000-0000-0000-0000-000000000001' and user_id = 'a0000000-0000-0000-0000-000000000005'
  returning 1
)
select is((select count(*) from deleted)::int, 0, 'Marta no puede eliminar el favorito de Carlos');

select * from finish();
rollback;
