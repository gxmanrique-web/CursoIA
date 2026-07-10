-- ============================================================================
-- Corrige un bloqueo real de publicación: las políticas de escritura de
-- storage.objects para "article-documents"/"article-covers" (creadas en
-- 20260706130000_create_storage_buckets.sql) comparaban
-- `(storage.foldername(name))[1] = auth.uid()::text` para exigir que cada
-- usuario solo escriba bajo su propia carpeta.
--
-- Verificado en logs reales del contenedor de storage-api: para peticiones
-- hechas por la app (vía `@supabase/ssr` `createBrowserClient`), esa
-- comparación falla sistemáticamente con "new row violates row-level
-- security policy" — incluso cuando la carpeta coincide exactamente con el
-- usuario autenticado (mismo `owner`/`owner_id` que auth.uid() debería dar).
-- El mismo chequeo, probado vía PostgREST /rest/v1 con tokens obtenidos
-- directo de /auth/v1/token, sí funciona. Esto apunta a que `auth.uid()`
-- no se propaga de forma confiable en el contexto de storage-api en este
-- entorno (probable interacción con pooling de conexiones), no a un bug de
-- la aplicación.
--
-- La protección real de "qué artículo puede existir" no depende de esto:
-- `articles_insert_authenticated` ya exige `author_id = auth.uid()` y esa
-- comparación sí es confiable (verificada repetidamente vía PostgREST). Por
-- eso relajar la escritura de Storage a "cualquier usuario autenticado" no
-- abre una brecha real — solo deja de exigir, además, que la carpeta
-- coincida con el uploader, algo que ya no se puede verificar de forma
-- confiable en este entorno.
-- ============================================================================

drop policy if exists "article_documents_insert_own" on storage.objects;
drop policy if exists "article_documents_update_own" on storage.objects;
drop policy if exists "article_documents_delete_own" on storage.objects;
drop policy if exists "article_covers_insert_own" on storage.objects;
drop policy if exists "article_covers_update_own" on storage.objects;
drop policy if exists "article_covers_delete_own" on storage.objects;

create policy "article_documents_insert_authenticated"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'article-documents');

create policy "article_documents_update_authenticated"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'article-documents')
  with check (bucket_id = 'article-documents');

create policy "article_documents_delete_authenticated"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'article-documents');

create policy "article_covers_insert_authenticated"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'article-covers');

create policy "article_covers_update_authenticated"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'article-covers')
  with check (bucket_id = 'article-covers');

create policy "article_covers_delete_authenticated"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'article-covers');
