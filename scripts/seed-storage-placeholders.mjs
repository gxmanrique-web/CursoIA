// `supabase/seed.sql` inserta filas de `articles` que referencian portadas
// (p. ej. "articles/<id>/cover.jpg"), pero un seed SQL no puede subir bytes
// de archivo a Storage — solo puede insertar filas en la base de datos. Por
// eso, tras `supabase db reset`, esas rutas de portada no existen realmente
// en el bucket y las tarjetas del listado muestran una imagen rota.
//
// Este script sube una imagen placeholder a exactamente esas rutas usando
// la service role key (necesario: esas rutas no pertenecen a la carpeta de
// ningún usuario real, así que las políticas normales de `storage.objects`
// las rechazarían). Es idempotente y no modifica `seed.sql` ni ninguna
// migración existente.
//
// Uso: node scripts/seed-storage-placeholders.mjs
// (requiere que `supabase start` / `db:reset` ya se haya ejecutado)

import { readFileSync } from "node:fs"
import { createClient } from "@supabase/supabase-js"

function loadEnvLocal() {
  const content = readFileSync(new URL("../.env.local", import.meta.url), "utf8")
  const env = {}
  for (const line of content.split("\n")) {
    const match = line.match(/^([A-Z_]+)=(.*)$/)
    if (match) env[match[1]] = match[2].trim()
  }
  return env
}

const SEED_COVER_PATHS = [
  "articles/b0000000-0000-0000-0000-000000000001/cover.jpg",
  "articles/b0000000-0000-0000-0000-000000000003/cover.jpg",
]

// PNG de 1x1 transparente; Storage sirve el Content-Type indicado sin
// validar la extensión del nombre de archivo.
const PLACEHOLDER_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64"
)

async function main() {
  const env = loadEnvLocal()
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

  for (const path of SEED_COVER_PATHS) {
    const { error } = await supabase.storage
      .from("article-covers")
      .upload(path, PLACEHOLDER_PNG, { contentType: "image/png", upsert: true })

    if (error) {
      console.error(`✗ ${path}:`, error.message)
      process.exitCode = 1
    } else {
      console.log(`✓ ${path}`)
    }
  }
}

main()
