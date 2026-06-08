import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

/** Mirrors vercel.json builder alias → /tools/<name> redirects for local dev. */
const BUILDER_ALIAS_REDIRECTS: Record<string, string> = {
  "/llms-builder": "/tools/llms-builder",
  "/robots-builder": "/tools/robots-builder",
  "/sitemap-builder": "/tools/sitemap-builder",
  "/security-builder": "/tools/security-builder",
  "/manifest-builder": "/tools/manifest-builder",
  "/ads-builder": "/tools/ads-builder",
  "/humans-builder": "/tools/humans-builder",
  "/ai-builder": "/tools/ai-builder",
};

function builderAliasRedirects(): Plugin {
  return {
    name: "builder-alias-redirects",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = req.url?.split("?")[0] ?? "";
        const destination = BUILDER_ALIAS_REDIRECTS[pathname];
        if (!destination) {
          next();
          return;
        }
        const query = req.url?.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
        res.writeHead(308, { Location: `${destination}${query}` });
        res.end();
      });
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    builderAliasRedirects(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  css: {
    postcss: {
      plugins: [],
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
