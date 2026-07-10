-- ============================================================================
-- ReadHub — Datos de prueba.
-- Ejecutado automáticamente por `supabase db reset` / `supabase start`.
-- Contraseña de todos los usuarios de prueba: Password123!
-- Requiere que las migraciones (incluida la trigger handle_new_user) ya
-- estén aplicadas: cada INSERT en auth.users crea su fila en public.profiles.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- USUARIOS DE PRUEBA
-- ----------------------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated',
   'admin@readhub.test', extensions.crypt('Password123!', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated',
   'ana@readhub.test', extensions.crypt('Password123!', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated',
   'luis@readhub.test', extensions.crypt('Password123!', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated',
   'marta@readhub.test', extensions.crypt('Password123!', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000005', 'authenticated', 'authenticated',
   'carlos@readhub.test', extensions.crypt('Password123!', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');

insert into auth.identities (
  id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
)
select
  gen_random_uuid(), u.id::text, u.id,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true, 'phone_verified', false),
  'email', now(), now(), now()
from auth.users u
where u.id in (
  'a0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000004',
  'a0000000-0000-0000-0000-000000000005'
);

-- Los perfiles ya existen (creados por el trigger on_auth_user_created);
-- se completan sus datos y su rol.
update public.profiles set role = 'admin', birth_date = '1988-02-10', phone = '+34600000001'
  where id = 'a0000000-0000-0000-0000-000000000001'; -- admin
update public.profiles set role = 'writer', birth_date = '1992-05-14', phone = '+34600000002'
  where id = 'a0000000-0000-0000-0000-000000000002'; -- ana (writer)
update public.profiles set role = 'writer', birth_date = '1985-11-30', phone = '+34600000003'
  where id = 'a0000000-0000-0000-0000-000000000003'; -- luis (writer)
update public.profiles set role = 'reader', birth_date = '1998-07-22', phone = '+34600000004'
  where id = 'a0000000-0000-0000-0000-000000000004'; -- marta (reader)
update public.profiles set role = 'reader', birth_date = '2001-01-05', phone = '+34600000005'
  where id = 'a0000000-0000-0000-0000-000000000005'; -- carlos (reader)

-- ----------------------------------------------------------------------------
-- ARTICLES
-- ----------------------------------------------------------------------------
insert into public.articles (id, author_id, title, summary, document_path, image_path, is_public) values
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002',
   'Introducción a PostgreSQL', 'Conceptos básicos del motor relacional que usa Supabase.',
   'articles/b0000000-0000-0000-0000-000000000001/document.md',
   'articles/b0000000-0000-0000-0000-000000000001/cover.jpg', true),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002',
   'Notas privadas de investigación', 'Borrador sin publicar de Ana.',
   'articles/b0000000-0000-0000-0000-000000000002/document.md',
   null, false),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003',
   'Row Level Security en Supabase', 'Cómo diseñar políticas RLS por tabla.',
   'articles/b0000000-0000-0000-0000-000000000003/document.md',
   'articles/b0000000-0000-0000-0000-000000000003/cover.jpg', true),
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000003',
   'Borrador: ideas para el próximo artículo', 'Apuntes preliminares de Luis, aún sin publicar.',
   'articles/b0000000-0000-0000-0000-000000000004/document.md',
   null, false);

-- ----------------------------------------------------------------------------
-- COMMENTS
-- ----------------------------------------------------------------------------
insert into public.comments (article_id, user_id, comment) values
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 'Muy claro, gracias por la explicación.'),
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000005', '¿Podrías profundizar en los índices?'),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000005', 'Excelente resumen de RLS.');

-- ----------------------------------------------------------------------------
-- LIKES (respeta UNIQUE(article_id, user_id))
-- ----------------------------------------------------------------------------
insert into public.likes (article_id, user_id) values
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004'),
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000005'),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000005');

-- ----------------------------------------------------------------------------
-- VIEWS (eventos independientes, no un contador)
-- ----------------------------------------------------------------------------
insert into public.views (article_id, user_id) values
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004'),
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000005'),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000004'),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002');

-- ----------------------------------------------------------------------------
-- FAVORITES
-- ----------------------------------------------------------------------------
insert into public.favorites (article_id, user_id) values
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000004'),
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000005');
