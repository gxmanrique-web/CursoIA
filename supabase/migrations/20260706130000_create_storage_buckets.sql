-- ============================================================================
-- Buckets de Supabase Storage para la publicación de artículos (Flujo 6).
--
-- No modifica ninguna migración existente: es puramente aditiva. Se crea
-- porque, sin ella, "subir documento" y "subir imagen" son irrealizables —
-- no había ningún bucket provisionado (supabase/config.toml los trae
-- comentados y ninguna migración anterior los crea).
--
-- Convención de rutas: "<author_id>/<article_id>/<archivo>". El primer
-- segmento (author_id) permite validar la propiedad en las políticas de
-- INSERT sin depender de que la fila del artículo ya exista, porque el
-- flujo de publicación sube los archivos antes de insertar el artículo.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit)
values
  ('article-documents', 'article-documents', false, 20971520), -- 20 MiB, privado
  ('article-covers', 'article-covers', true, 5242880)           -- 5 MiB, público
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- article-documents (privado)
-- INSERT/UPDATE/DELETE: solo bajo la propia carpeta (author_id = auth.uid()).
-- SELECT: solo si el artículo que referencia ese `document_path` es público
-- o pertenece al usuario (espeja articles_select_public/articles_select_own).
-- La lectura real de la UI se hace vía URL firmada (createSignedUrl), que
-- también exige que esta política de SELECT se cumpla.
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- article-covers (público)
-- INSERT/UPDATE/DELETE: solo bajo la propia carpeta. La lectura pública
-- (getPublicUrl) no pasa por RLS al ser un bucket público, así que no
-- necesita política de SELECT.
-- ----------------------------------------------------------------------------
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
