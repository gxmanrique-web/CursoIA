-- ============================================================================
-- Políticas RLS. RLS ya fue habilitada en cada tabla en su migración de creación.
--
-- RLS controla filas, pero Postgres exige además el GRANT a nivel de tabla:
-- sin él, el rol recibe "permission denied" antes de que la política se evalúe.
-- Se otorga aquí el mínimo necesario por rol y tabla; el filtrado fino de filas
-- queda a cargo de las políticas definidas más abajo.
--
-- Dos hallazgos de Postgres/RLS que obligan a ir un poco más allá de la letra
-- literal del spec para que las políticas exigidas realmente funcionen:
--
-- 1) UPDATE/DELETE con RLS requieren que la fila también sea VISIBLE según
--    alguna política de SELECT, no solo según la política de UPDATE/DELETE.
--    Por eso `likes` recibe una política de SELECT acotada al propio usuario
--    (si no, "DELETE: solo propietario" sería literalmente inejecutable), y
--    `articles` recibe una política de SELECT adicional para que el autor
--    vea sus propios artículos privados (si no, no podría editar ni borrar
--    sus propios borradores no públicos, pese a que el spec dice "UPDATE/
--    DELETE: solo el autor" sin restringirlo a artículos públicos).
-- 2) Además del GRANT a nivel de tabla (obligatorio: sin él, "permission
--    denied" antes de evaluar cualquier política).
-- ============================================================================
grant select, insert, update, delete on public.articles to authenticated;
grant select on public.articles to anon;

grant select, update on public.profiles to authenticated;

grant select, insert, update, delete on public.comments to authenticated;
grant select on public.comments to anon;

grant select, insert, delete on public.likes to authenticated;

grant select, insert on public.views to authenticated;

grant select, insert, delete on public.favorites to authenticated;

-- ----------------------------------------------------------------------------
-- PROFILES: cada usuario únicamente puede ver y modificar su perfil.
-- Nota: tal como está especificado, un usuario podría modificar su propio
-- campo "role" (auto-escalar privilegios). El spec no restringe columnas;
-- se documenta como riesgo conocido a resolver en la fase de documentación
-- técnica o con un trigger BEFORE UPDATE si se decide endurecerlo.
-- ----------------------------------------------------------------------------
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ----------------------------------------------------------------------------
-- ARTICLES
-- SELECT: todos pueden leer artículos públicos.
-- INSERT: solo usuarios autenticados (y el autor debe ser el propio usuario).
-- UPDATE / DELETE: solo el autor.
-- ----------------------------------------------------------------------------
create policy "articles_select_public"
  on public.articles for select
  to anon, authenticated
  using (is_public = true);

-- Necesaria para que UPDATE/DELETE ("solo el autor") funcionen también sobre
-- artículos privados: en Postgres, esas operaciones exigen que la fila sea
-- visible por alguna política de SELECT además de cumplir su propia USING.
create policy "articles_select_own"
  on public.articles for select
  to authenticated
  using (auth.uid() = author_id);

create policy "articles_insert_authenticated"
  on public.articles for insert
  to authenticated
  with check (auth.uid() = author_id);

create policy "articles_update_own"
  on public.articles for update
  to authenticated
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

create policy "articles_delete_own"
  on public.articles for delete
  to authenticated
  using (auth.uid() = author_id);

-- ----------------------------------------------------------------------------
-- COMMENTS
-- SELECT: leer todos. INSERT: autenticado. UPDATE: solo autor.
-- DELETE: autor o admin.
-- ----------------------------------------------------------------------------
create policy "comments_select_all"
  on public.comments for select
  to anon, authenticated
  using (true);

create policy "comments_insert_authenticated"
  on public.comments for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "comments_update_own"
  on public.comments for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "comments_delete_own_or_admin"
  on public.comments for delete
  to authenticated
  using (auth.uid() = user_id or public.is_admin());

-- ----------------------------------------------------------------------------
-- LIKES
-- INSERT: solo autenticado. DELETE: solo propietario.
-- El spec no pide explícitamente una política de SELECT, pero sin ella DELETE
-- es inejecutable (ver nota superior), así que se agrega acotada al propio
-- usuario: cada uno solo puede ver (y por tanto borrar) sus propios likes.
-- ----------------------------------------------------------------------------
create policy "likes_select_own"
  on public.likes for select
  to authenticated
  using (auth.uid() = user_id);

create policy "likes_insert_authenticated"
  on public.likes for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "likes_delete_own"
  on public.likes for delete
  to authenticated
  using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- VIEWS
-- INSERT: usuarios autenticados.
-- SELECT: solo administradores o el autor del artículo visualizado.
-- (Tabla de solo lectura tras el insert: sin políticas de UPDATE/DELETE.)
-- ----------------------------------------------------------------------------
create policy "views_insert_authenticated"
  on public.views for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "views_select_admin_or_author"
  on public.views for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.articles a
      where a.id = views.article_id
        and a.author_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- FAVORITES: solo el propietario puede ver, crear y eliminar sus favoritos.
-- ----------------------------------------------------------------------------
create policy "favorites_select_own"
  on public.favorites for select
  to authenticated
  using (auth.uid() = user_id);

create policy "favorites_insert_own"
  on public.favorites for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "favorites_delete_own"
  on public.favorites for delete
  to authenticated
  using (auth.uid() = user_id);
