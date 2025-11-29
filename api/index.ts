import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "../server/routes.js";
import { serveStatic } from "../server/vite.js";

// Create Express app instance
const app = express();

// Trust proxy for Vercel (required for secure cookies behind proxy)
app.set('trust proxy', 1);

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}

app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      console.log(logLine);
    }
  });

  next();
});

// Initialize app (only once, cached across invocations)
let appInitialized = false;
let initPromise: Promise<void> | null = null;

async function initializeApp(): Promise<void> {
  if (appInitialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      console.log('[Vercel] Starting app initialization...');
      
      console.log('[Vercel] Registering routes...');
      await registerRoutes(app);
      console.log('[Vercel] Routes registered successfully');

      // Error handling middleware
      app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
        const status = err.status || err.statusCode || 500;
        const message = err.message || "Internal Server Error";
        console.error('[Vercel] Express error:', err);
        res.status(status).json({ message });
      });

      // In production on Vercel, serve static files
      if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
        console.log('[Vercel] Setting up static file serving...');
        serveStatic(app);
        console.log('[Vercel] Static file serving configured');
      }

      appInitialized = true;
      console.log('[Vercel] App initialization complete');
    } catch (error) {
      console.error('[Vercel] FATAL: App initialization failed:', error);
      // Reset promise so initialization can be retried
      initPromise = null;
      throw error;
    }
  })();

  return initPromise;
}

// Initialize immediately (this runs at cold start)
// The promise will be awaited on first request if not complete
const initPromiseResult = initializeApp().catch(err => {
  console.error('[Vercel] Background init failed:', err);
});

// Export the Express app - Vercel handles the rest automatically
// Using a wrapper to ensure initialization is complete before handling requests
export default async function handler(req: any, res: any) {
  try {
    // Wait for initialization to complete
    await initPromiseResult;
    
    // If initialization failed, try again
    if (!appInitialized) {
      console.log('[Vercel] Retrying initialization...');
      await initializeApp();
    }
    
    // Ensure response hasn't been sent
    if (!res.headersSent) {
      // Let Express handle the request
      return app(req, res);
    }
  } catch (error) {
    console.error('[Vercel] Handler error:', error);
    // Only send response if not already sent
    if (!res.headersSent) {
      res.status(500).json({
        message: 'Server initialization failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        ...(process.env.NODE_ENV === "development" && error instanceof Error ? { stack: error.stack } : {})
      });
    }
  }
}
