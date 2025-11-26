import type { VercelRequest, VercelResponse } from '@vercel/node';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "../server/routes";
import { serveStatic } from "../server/vite";

// Create Express app instance
const app = express();

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
let appPromise: Promise<express.Express> | null = null;

async function initializeApp(): Promise<express.Express> {
  if (appInitialized) return app;
  if (appPromise) return appPromise;

  appPromise = (async () => {
    await registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
      throw err;
    });

    // In production on Vercel, serve static files
    if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
      serveStatic(app);
    }

    appInitialized = true;
    return app;
  })();

  return appPromise;
}

// Vercel serverless function handler
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Ensure app is initialized
  const expressApp = await initializeApp();

  // Use Vercel's built-in Express support
  // Vercel automatically handles Express apps when exported as default
  return new Promise<void>((resolve, reject) => {
    // Create a proper Express request/response wrapper
    const expressReq = Object.create(req);
    expressReq.method = req.method || 'GET';
    expressReq.url = req.url || '/';
    expressReq.originalUrl = req.url || '/';
    expressReq.path = req.url?.split('?')[0] || '/';
    expressReq.query = req.query || {};
    expressReq.body = req.body;
    expressReq.headers = req.headers;
    expressReq.get = (name: string) => {
      const header = req.headers[name.toLowerCase()];
      return Array.isArray(header) ? header[0] : header;
    };
    expressReq.cookies = req.cookies || {};
    expressReq.hostname = req.headers.host?.split(':')[0] || '';
    expressReq.protocol = req.headers['x-forwarded-proto'] || 'https';
    expressReq.ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || '';

    const expressRes = Object.create(res);
    let responseEnded = false;
    
    expressRes.status = (code: number) => {
      res.status(code);
      return expressRes;
    };
    
    expressRes.json = (body: any) => {
      if (!responseEnded) {
        res.json(body);
        responseEnded = true;
        resolve();
      }
      return expressRes;
    };
    
    expressRes.send = (body: any) => {
      if (!responseEnded) {
        res.send(body);
        responseEnded = true;
        resolve();
      }
      return expressRes;
    };
    
    expressRes.end = (body?: any) => {
      if (!responseEnded) {
        res.end(body);
        responseEnded = true;
        resolve();
      }
      return expressRes;
    };
    
    expressRes.setHeader = (name: string, value: string | string[]) => {
      res.setHeader(name, value);
      return expressRes;
    };
    
    expressRes.set = (name: string, value: string | string[]) => {
      res.setHeader(name, value);
      return expressRes;
    };
    
    expressRes.on = (event: string, callback: (...args: any[]) => void) => {
      if (event === 'finish' && responseEnded) {
        callback();
      }
      return expressRes;
    };

    // Handle the request through Express
    expressApp(expressReq, expressRes, (err: any) => {
      if (err) {
        if (!responseEnded) {
          res.status(500).json({ message: err.message || 'Internal Server Error' });
          responseEnded = true;
        }
        reject(err);
      } else if (!responseEnded) {
        // If Express didn't send a response, send a 404
        res.status(404).json({ message: 'Not Found' });
        responseEnded = true;
        resolve();
      }
    });
  });
}

