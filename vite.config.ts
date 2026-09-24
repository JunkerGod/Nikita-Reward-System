import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Preload the two critical font files (Nunito for the app, Great Vibes for the chart).
function preloadFonts(): Plugin {
  const wanted = ["nunito-latin-wght-normal", "great-vibes-latin-400-normal"];
  return {
    name: "preload-fonts",
    apply: "build",
    transformIndexHtml: {
      order: "post",
      handler(_html, ctx) {
        const files = Object.keys(ctx.bundle ?? {}).filter(
          (f) => f.endsWith(".woff2") && wanted.some((w) => f.includes(w)),
        );
        return files.map((f) => ({
          tag: "link",
          attrs: { rel: "preload", as: "font", type: "font/woff2", href: `/${f}`, crossorigin: "" },
          injectTo: "head" as const,
        }));
      },
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), preloadFonts()],
  // One small app: React, Supabase and GSAP together are ~240 kB gzipped, which is fine here.
  build: { chunkSizeWarningLimit: 900 },
});
