-- Índices recomendados para las consultas más frecuentes (filtrado por artículo/autor).
create index articles_author_id_idx on public.articles (author_id);
create index views_article_id_idx on public.views (article_id);
create index likes_article_id_idx on public.likes (article_id);
create index comments_article_id_idx on public.comments (article_id);
create index favorites_article_id_idx on public.favorites (article_id);
