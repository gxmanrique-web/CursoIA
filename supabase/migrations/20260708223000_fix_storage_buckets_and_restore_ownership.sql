-- ============================================================================
-- La causa real de "new row violates row-level security policy" al publicar
-- un artículo era que los buckets "article-documents"/"article-covers" nunca
-- llegaron a existir en este proyecto: la migración que los crea
-- (20260706130000_create_storage_buckets.sql) se había ejecutado manualmente
-- desde el SQL Editor del dashboard en vez de vía CLI/migración rastreada, y
-- el INSERT en storage.buckets no persistió (storage.buckets estaba vacío),
-- aunque las políticas de storage.objects sí habían quedado creadas.
--
-- La migración 20260708220000_relax_storage_write_policies.sql diagnosticó
-- esto como que `auth.uid()` "no se propaga de forma confiable en
-- storage-api" y, para evitarlo, relajó las políticas de escritura a
-- "cualquier usuario autenticado" sin exigir que la carpeta coincida con el
-- uploader. Ese diagnóstico es incorrecto (auth.uid() sí se propaga de forma
-- confiable en storage-api; es el mecanismo estándar de Supabase Storage) y
-- la relajación abre una brecha real: cualquier usuario autenticado puede
-- escribir, sobrescribir o borrar los archivos de cualquier otro usuario en
-- ambos buckets.
--
-- Esta migración: (1) crea los buckets si no existen, y (2) restaura las
-- políticas de propiedad por carpeta de 20260706130000.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit)
values
  ('article-documents', 'article-documents', false, 20971520), -- 20 MiB, privado
  ('article-covers', 'article-covers', true, 5242880)           -- 5 MiB, público
on conflict (id) do nothing;

drop policy if exists "article_documents_insert_authenticated" on storage.objects;
drop policy if exists "article_documents_update_authenticated" on storage.objects;
drop policy if exists "article_documents_delete_authenticated" on storage.objects;
drop policy if exists "article_covers_insert_authenticated" on storage.objects;
drop policy if exists "article_covers_update_authenticated" on storage.objects;
drop policy if exists "article_covers_delete_authenticated" on storage.objects;

drop policy if exists "article_documents_insert_own" on storage.objects;
drop policy if exists "article_documents_update_own" on storage.objects;
drop policy if exists "article_documents_delete_own" on storage.objects;
drop policy if exists "article_covers_insert_own" on storage.objects;
drop policy if exists "article_covers_update_own" on storage.objects;
drop policy if exists "article_covers_delete_own" on storage.objects;

create policy "article_documents_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'article-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

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

create policy "article_documents_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'article-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- La política de SELECT de 20260706130000 tampoco había llegado a aplicarse
-- (no existía ninguna política de SELECT sobre "article-documents").
drop policy if exists "article_documents_select_accessible" on storage.objects;

create policy "article_documents_select_accessible"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'article-documents'
    and exists (
      select 1 from public.articles a
      where a.document_path = storage.objects.name
        and (a.is_public = true or a.author_id = auth.uid())
    )
  );

create policy "article_covers_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'article-covers'
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

create policy "article_covers_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'article-covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
