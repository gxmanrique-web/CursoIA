-- ============================================================================
-- Causa raíz real de "new row violates row-level security policy" al subir
-- documentos/portadas (verificada con SQL directo, aislando cada variable):
--
--   set local role authenticated;
--   set local request.jwt.claims = '{"sub":"<uid>","role":"authenticated"}';
--   insert into storage.objects (...) values ('article-documents', '<uid>/a/f.txt', ...);
--   -- sin RETURNING: éxito.
--   insert into storage.objects (...) values (...) returning id, name;
--   -- con RETURNING: "new row violates row-level security policy for table objects"
--
-- Postgres exige que una fila insertada/actualizada con RETURNING también
-- pase las políticas de SELECT de la tabla (para poder devolver los datos al
-- cliente) — no solo el WITH CHECK de INSERT/UPDATE. storage-api siempre usa
-- RETURNING para devolver los metadatos del objeto subido.
--
-- La única política de SELECT sobre "article-documents"
-- (article_documents_select_accessible) exige que exista una fila en
-- public.articles cuyo document_path apunte al objeto. Pero el flujo de
-- publicación sube el archivo ANTES de insertar el artículo (ver comentario
-- en storage.service.ts / 20260706130000_create_storage_buckets.sql) — en
-- ese momento no existe ninguna fila en articles todavía, así que el EXISTS
-- da falso, la comprobación de RETURNING falla, y Postgres lo reporta con el
-- mismo mensaje genérico que un fallo de WITH CHECK. El bucket
-- "article-covers" tiene el problema aún más marcado: nunca tuvo ninguna
-- política de SELECT, así que cualquier INSERT/UPDATE con RETURNING fallaba
-- siempre, para cualquier usuario.
--
-- Esto también explica por qué las migraciones previas (20260708220000,
-- 20260708223000, 20260710170000) no lo resolvieron: todas ajustaban el
-- WITH CHECK (auth.uid() vs. autenticado-genérico) sin tocar la política de
-- SELECT, que es la que realmente bloquea. Y por qué "createSignedUrl" sobre
-- un documento de un artículo YA existente funcionaba bien en las pruebas:
-- ese caso sí cumple el EXISTS de articles.
--
-- Fix: además de la política de SELECT basada en el artículo (necesaria para
-- que otros usuarios lean documentos de artículos públicos/propios), se
-- agrega una política de SELECT por propiedad de carpeta —igual a la que ya
-- rige INSERT/UPDATE/DELETE— para que el propio uploader siempre pueda ver
-- (y por tanto recibir vía RETURNING) los objetos que él mismo escribe, exista
-- o no todavía la fila de articles. "article-covers" no tenía ninguna
-- política de SELECT: se agrega la misma por propiedad de carpeta.
--
-- Se revierte también el relajamiento de WITH CHECK de 20260710170000 (bucket
-- únicamente): auth.uid() sí es confiable en el WITH CHECK de INSERT/UPDATE
-- (confirmado con la prueba de SQL directo de arriba); el diagnóstico de esa
-- migración fue incorrecto porque no aisló el efecto de RETURNING. Se vuelve
-- a exigir propiedad de carpeta en la escritura, como en el diseño original.
-- ============================================================================

drop policy if exists "article_documents_insert_authenticated" on storage.objects;
drop policy if exists "article_covers_insert_authenticated" on storage.objects;

create policy "article_documents_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'article-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "article_covers_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'article-covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "article_documents_update_own" on storage.objects;
drop policy if exists "article_covers_update_own" on storage.objects;

create policy "article_documents_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'article-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'article-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "article_covers_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'article-covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'article-covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Necesarias para que INSERT/UPDATE ... RETURNING (usado por storage-api)
-- pueda ver la fila que el propio usuario acaba de escribir, sin depender de
-- que ya exista un artículo que la referencie.
create policy "article_documents_select_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'article-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "article_covers_select_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'article-covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
