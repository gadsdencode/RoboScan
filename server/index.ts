import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import { setupVite, serveStatic, log } from "./vite.js";
import { AppError } from "./errors/AppError.js";
// Scheduler is now handled by Vercel Cron Jobs (api/cron/scheduler.ts)

// Default sensitive keys to redact from debug logs
const SENSITIVE_KEYS = [
  'token',
  'password',
  'secret',
  'passwordHash',
  'apiKey',
  'authorization',
  'cookie',
  'session',
  'credit_card',
  'ssn',
];

/**
 * Recursively redacts sensitive keys from objects before logging.
 * Prevents accidental exposure of secrets in debug logs.
 */
function redactSensitiveKeys(
  obj: any,
  sensitiveKeys: string[] = SENSITIVE_KEYS
): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  const redacted = Array.isArray(obj) ? [...obj] : { ...obj };

  for (const key of Object.keys(redacted)) {
    const lowerKey = key.toLowerCase();
    // Check if key contains any sensitive pattern
    if (sensitiveKeys.some(sk => lowerKey.includes(sk.toLowerCase()))) {
      redacted[key] = '[REDACTED]';
    } else if (typeof redacted[key] === 'object' && redacted[key] !== null) {
      redacted[key] = redactSensitiveKeys(redacted[key], sensitiveKeys);
    }
  }

  return redacted;
}

const app = express();

// Trust proxy for secure cookies behind reverse proxy (Vercel, etc.)
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

// Request logger - logs only metadata to avoid memory leaks
// Set DEBUG_RESPONSE_BODY=true to enable truncated body logging (max 1KB)
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  
  // Only capture body in debug mode, and truncate to prevent memory issues
  let truncatedBody: string | undefined;
  const shouldLogBody = process.env.DEBUG_RESPONSE_BODY === 'true';
  
  if (shouldLogBody) {
    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      // Redact sensitive keys and truncate body to max 1KB to prevent memory leaks
      try {
        // Redact sensitive data before logging
        const redactedBody = redactSensitiveKeys(bodyJson);
        const bodyStr = JSON.stringify(redactedBody);
        truncatedBody = bodyStr.length > 1024 
          ? bodyStr.slice(0, 1024) + '...[truncated]' 
          : bodyStr;
      } catch {
        truncatedBody = '[non-serializable]';
      }
      return originalResJson.apply(res, [bodyJson, ...args]);
    };
  }

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      // Log only essential metadata by default
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      
      // Append truncated body only in debug mode
      if (shouldLogBody && truncatedBody) {
        logLine += ` :: ${truncatedBody}`;
        // Final truncation for console readability
        if (logLine.length > 200) {
          logLine = logLine.slice(0, 199) + "…";
        }
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Centralized error handler - handles AppError, Zod validation, and unknown errors
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    // Handle AppError instances (operational errors)
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({
        message: err.message,
        code: err.code,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
      });
    }

    // Handle Zod validation errors
    if (err.name === 'ZodError') {
      return res.status(400).json({
        message: 'Validation error',
        code: 'VALIDATION_ERROR',
        errors: err.errors
      });
    }

    // Log unknown/unexpected errors
    console.error('[Server] Unhandled error:', err);

    // Fallback for unknown errors - don't expose details in production
    const status = err.status || err.statusCode || 500;
    res.status(status).json({
      message: process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message || 'Internal Server Error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, async () => {
    log(`serving on port ${port}`);
    
    // Scheduler is handled by Vercel Cron Jobs in production
    // For local development, you can manually trigger the scheduler
    if (process.env.NODE_ENV === "development" && process.env.RUN_SCHEDULER === "true") {
      const { startScheduler } = await import("./scheduler.js");
      startScheduler();
    }
  });
})();
