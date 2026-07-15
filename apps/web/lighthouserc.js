// Config de Lighthouse CI (Prompt 3, evolución del pipeline).
// Audita únicamente rutas públicas y estáticas (/login, /register): son las
// dos únicas páginas que Next pre-renderiza como estáticas (ver tabla de
// `next build`, columna ○), así que no dependen de una sesión de Supabase
// real ni de datos sembrados — pueden auditarse en CI sin el backend que sí
// necesita el job `e2e` (Prompt 5). Las rutas del dashboard están detrás de
// auth y quedan fuera de esta auditoría automática de performance.
module.exports = {
  ci: {
    collect: {
      startServerCommand: "npm run start -- -p 4300",
      startServerReadyPattern: "Ready in",
      startServerReadyTimeout: 30000,
      url: ["http://127.0.0.1:4300/login", "http://127.0.0.1:4300/register"],
      numberOfRuns: 3,
      settings: {
        preset: "desktop",
        onlyCategories: ["performance"],
      },
    },
    assert: {
      assertions: {
        "categories:performance": ["error", { minScore: 0.7 }],
        "largest-contentful-paint": ["error", { maxNumericValue: 4000 }],
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.1 }],
        "total-blocking-time": ["error", { maxNumericValue: 300 }],
      },
    },
    upload: {
      target: "filesystem",
      outputDir: "./.lighthouseci",
    },
  },
}
