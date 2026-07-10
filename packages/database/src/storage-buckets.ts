/**
 * Buckets provisionados por la migración
 * `supabase/migrations/*_create_storage_buckets.sql`: "article-documents"
 * (privado, URLs firmadas) y "article-covers" (público). Extraídas aquí
 * (en vez de junto a las funciones de subida) porque también las consume
 * `@readhub/ai` (embedding.service, server-side, sin acceso al bucket de
 * upload de la app web) para localizar el documento fuente de un artículo.
 */
export const ARTICLE_DOCUMENTS_BUCKET = "article-documents"
export const ARTICLE_COVERS_BUCKET = "article-covers"
