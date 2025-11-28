import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { type Server } from "http";

// Lazy imports for Vite - only needed in development mode
// These are NOT imported at module load time to prevent serverless crashes
let viteLogger: any = null;
let viteConfig: any = null;

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  // Dynamically import Vite and config only when needed (development only)
  const { createServer: createViteServer, createLogger } = await import("vite");
  
  if (!viteLogger) {
    viteLogger = createLogger();
  }
  
  if (!viteConfig) {
    const configModule = await import("../vite.config");
    viteConfig = configModule.default;
  }

  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg: string, options?: any) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      
      // Generate simple unique ID without nanoid dependency
      const uniqueId = Date.now().toString(36) + Math.random().toString(36).slice(2);
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${uniqueId}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  // For Vercel, static files are served from dist/public
  // For local development, also check dist/public
  const distPath = path.resolve(import.meta.dirname, "..", "dist", "public");

  if (!fs.existsSync(distPath)) {
    // Fallback to just "public" for backwards compatibility
    const fallbackPath = path.resolve(import.meta.dirname, "..", "public");
    if (fs.existsSync(fallbackPath)) {
      app.use(express.static(fallbackPath));
      app.use("*", (_req, res) => {
        res.sendFile(path.resolve(fallbackPath, "index.html"));
      });
      return;
    }
    // In production, if no static files exist, log warning but don't crash
    // The API routes will still work
    console.warn(
      `Warning: Could not find the build directory: ${distPath}. Static file serving disabled.`,
    );
    return;
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
