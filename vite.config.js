import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["logo_sp.svg", "robots.txt", "icons/*.png"],
      manifest: false, // usa o site.webmanifest existente em /public
      workbox: {
        // Ativa o novo SW imediatamente sem precisar fechar todas as abas
        skipWaiting: true,
        clientsClaim: true,
        // Cachear apenas JS, CSS, HTML, SVG e woff2 — excluir imagens grandes
        globPatterns: ["**/*.{js,css,html,svg,woff2}"],
        // Excluir fotos dos personais e screenshots do precache
        globIgnores: ["**/p[0-9]*.png", "**/screenshots/**"],
        // Não cachear rotas da API
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api/, /^\/billing/, /^\/auth/, /^\/health/],
        runtimeCaching: [
          {
            // Imagens de plataforma (fotos dos personais) — cache sob demanda
            urlPattern: /\/assets\/p\d+/i,
            handler: "CacheFirst",
            options: {
              cacheName: "platform-images",
              expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Ícones PWA
            urlPattern: /\/icons\//i,
            handler: "CacheFirst",
            options: {
              cacheName: "pwa-icons",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        enabled: false, // ativa em dev apenas quando necessário
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Alerta se algum chunk passar de 500 kB
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          // Animação — framer-motion + lenis
          if (id.includes("framer-motion") || id.includes("lenis")) {
            return "motion";
          }

          // Gráficos — recharts + d3
          if (id.includes("recharts") || id.includes("d3-") || id.includes("victory")) {
            return "charts";
          }

          // Radix UI — componentes de UI headless
          if (id.includes("@radix-ui")) {
            return "radix";
          }

          // React router
          if (id.includes("react-router") || id.includes("react-router-dom")) {
            return "router";
          }

          // React core
          if (id.includes("/react/") || id.includes("/react-dom/") || id.includes("/scheduler/")) {
            return "react";
          }
        },
      },
    },
  },
});
