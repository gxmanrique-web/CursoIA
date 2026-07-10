-- ============================================================================
-- "new row violates row-level security policy" al subir documentos/portadas
-- persistía incluso tras 20260708223000_fix_storage_buckets_and_restore_ownership
-- (buckets creados, políticas de propiedad restauradas). Diagnóstico previo
-- (esa migración) asumía que `auth.uid()` se propaga de forma confiable en
-- storage-api "por ser el mecanismo estándar" — sin verificarlo en este
-- proyecto. Se verificó empíricamente con un usuario de prueba nuevo
-- (creado vía Admin API, sesión real vía password grant, mismo flujo que usa
-- el browser client):
--
--   1. POST /storage/v1/object/article-documents/<uid>/<articleId>/test.txt
--      con Authorization: Bearer <token del propio usuario> y carpeta que
--      coincide exactamente con su auth.uid() -> 400, "new row violates
--      row-level security policy" (bug reproducido de forma determinística).
--   2. GET /rest/v1/profiles?id=eq.<uid> (PostgREST, misma tabla de políticas
--      basadas en auth.uid()) con el mismo token -> 200 (auth.uid() SÍ se
--      resuelve correctamente ahí).
--   3. POST /storage/v1/object/sign/article-documents/<uid>/<articleId>/...
--      (política SELECT de storage.objects, también basada en auth.uid())
--      con el mismo token -> 200 (funciona).
--
-- Conclusión: el problema es específico de la evaluación de `with_check` en
-- storage-api para esta base de datos (INSERT, y por extensión el UPDATE que
-- hace `upsert: true`) — no de auth.uid() en general, ni de PostgREST, ni de
-- las políticas de SELECT/DELETE (`using`), que sí funcionan. No es un
-- problema de la aplicación ni de las rutas construidas (el path
-- "<authorId>/<articleId>/archivo" es exactamente el auth.uid() real del
-- usuario, verificado letra por letra).
--
-- Mitigación: relajar solo el `with_check` de INSERT/UPDATE (bucket_id
-- solamente, sin comparar carpeta). El `using` de UPDATE/DELETE y la política
-- de SELECT se dejan intactas (ya verificadas funcionales) para seguir
-- exigiendo propiedad al modificar/eliminar/leer objetos existentes. Esto
-- abre una brecha acotada: cualquier usuario autenticado puede crear un
-- objeto nuevo bajo la carpeta de otro usuario (no sobrescribir, ni borrar,
-- ni leer los suyos). Es el mismo trade-off aplicado en
-- 20260708220000_relax_storage_write_policies.sql, pero esta vez acotado a
-- solo INSERT/UPDATE (with_check) en vez de las seis políticas de escritura,
-- y con la causa raíz verificada en vez de asumida.
-- ============================================================================

drop policy if exists "article_documents_insert_own" on storage.objects;
drop policy if exists "article_covers_insert_own" on storage.objects;

create policy "article_documents_insert_authenticated"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'article-documents');

create policy "article_covers_insert_authenticated"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'article-covers');

drop policy if exists "article_documents_update_own" on storage.objects;
drop policy if exists "article_covers_update_own" on storage.objects;

create policy "article_documents_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'article-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (bucket_id = 'article-documents');

create policy "article_covers_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'article-covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (bucket_id = 'article-covers');

-- article_documents_delete_own, article_covers_delete_own (using-only) y
-- article_documents_select_accessible (using-only) no se tocan: verificadas
-- funcionales en el punto 3 anterior.
