import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Los paquetes del workspace se exponen como TypeScript fuente (sin paso
  // de build propio); Next.js necesita transpilarlos explícitamente para
  // poder importarlos desde apps/web.
  transpilePackages: ["@readhub/types", "@readhub/database", "@readhub/ai", "@readhub/shared"],
  // Ancla la raíz del workspace a la raíz del monorepo (donde vive el único
  // package-lock.json real): evita que Turbopack infiera por error un
  // directorio superior no relacionado con este proyecto.
  turbopack: {
    root: path.join(__dirname, "..", ".."),
  },
};

export default nextConfig;
