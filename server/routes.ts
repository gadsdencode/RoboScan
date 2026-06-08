// server/routes.ts
// Main route configuration - mounts domain-specific controllers using Express Router

import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth.js";
import { storage } from "./storage.js";
import { ACHIEVEMENTS } from "./gamification.js";
import { csrfProtection } from "./middleware/csrfProtection.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { apiRateLimiter } from "./middleware/rateLimiter.js";

// Import all controllers
import {
  scanController,
  scanWorkerController,
  paymentController,
  reportController,
  recurringScansController,
  notificationController,
  tagController,
  gamificationController,
  llmsBuilderController,
  robotsFieldsController,
  toolsController,
  seoController,
  subscriptionController,
  webhookController,
  promotionalCodeController,
  accessController,
  buildersValidationController,
  shareController,
  badgeController,
} from "./controllers/index.js";
import { renderShareHtml } from "./utils/shareHtml.js";

// Guard against duplicate auth setup
let authInitialized = false;

export async function registerRoutes(app: Express): Promise<Server> {
  console.log('[Routes] Starting route registration...');
  
  // Validate required environment variables at runtime (not module load)
  // This allows the serverless function to start and return proper errors
  if (!process.env.JWT_SECRET) {
    console.error('[Routes] FATAL: Missing required environment variable: JWT_SECRET');
    // Add a fallback route that returns a clear error for ALL routes
    app.all('*', (req, res) => {
      res.status(500).json({ 
        message: 'Server configuration error: JWT_SECRET not set',
        error: 'MISSING_ENV_VAR'
      });
    });
    return createServer(app);
  }
  
  console.log('[Routes] Environment variables validated');

  // Setup authentication only once
  if (!authInitialized) {
    console.log('[Routes] Setting up authentication...');
    await setupAuth(app);
    authInitialized = true;
    console.log('[Routes] Authentication setup complete');
  }

  // [GAMIFICATION] Seed achievements on startup (onConflictDoNothing per row)
  try {
    console.log('[Routes] Seeding achievements...');
    for (const achievement of Object.values(ACHIEVEMENTS)) {
      await storage.createAchievement(achievement);
    }
    console.log('[Routes] Achievements seeded');
  } catch (error) {
    console.error('[Routes] Error seeding achievements:', error);
    // Don't fail startup for achievement seeding errors
  }

  // [SUBSCRIPTIONS] Guardian plan seeding moved to standalone script for faster cold starts
  // Run: npm run seed:plans (scripts/seed-plans.ts)
  if (process.env.SEED_DB === 'true') {
    console.log('[Routes] SEED_DB=true detected. For Guardian plan seeding, use: npm run seed:plans');
  }

  // ============== CSRF Protection ==============
  // Apply CSRF protection to all API routes that mutate state (POST, PUT, PATCH, DELETE)
  // This validates Origin header in production to prevent cross-site request forgery
  // Note: Webhooks are excluded as they use signature verification instead
  app.use('/api', csrfProtection());
  app.use('/api', apiRateLimiter);

  // ============== Mount Controllers ==============
  
  // Scan routes: POST /api/scan, GET /api/user/scans, GET /api/scans/:id, PATCH /api/scans/:id/tags
  // Also includes: GET /api/scan-jobs/:jobId/status for async scan polling
  app.use('/api/scan', scanController);           // POST /api/scan (route: /)
  app.use('/api/scans', scanController);          // GET /api/scans/:id, PATCH /api/scans/:id/tags
  app.use('/api/scan-jobs', scanController);      // GET /api/scan-jobs/:jobId/status (route: /:jobId/status)
  // Specific /api/user/* routes MUST mount before scanController: it registers GET /:id which
  // would otherwise match "tags", "achievements", "access-summary" and return 400 Invalid scan ID.
  app.use('/api/user', accessController);         // GET /api/user/access-summary
  app.use('/api/user', tagController);          // GET /api/user/tags
  app.use('/api/user', gamificationController);   // GET /api/user/achievements
  app.use('/api/user', scanController);           // GET /api/user/scans, GET /api/user/:id, …

  // Scan worker routes: POST /api/scan-worker (QStash background job endpoint)
  // These endpoints are called by QStash, not by users directly
  app.use('/api/scan-worker', scanWorkerController);
  app.use('/api/scan-callback', scanWorkerController);  // Callback endpoint for QStash

  // Payment routes: POST /api/create-payment-intent, POST /api/confirm-payment
  app.use('/api', paymentController);

  // Report routes: GET /api/optimization-report/:scanId
  app.use('/api/optimization-report', reportController);

  // Recurring scans routes: /api/recurring-scans/*
  app.use('/api/recurring-scans', recurringScansController);

  // Notification routes: /api/notifications/*
  app.use('/api/notifications', notificationController);

  // LLMs.txt builder routes: /api/validate-llms-txt, /api/llms-fields/*
  app.use('/api', llmsBuilderController);

  // Robots fields routes: /api/robots-fields/*
  app.use('/api/robots-fields', robotsFieldsController);

  // Builder validation (non-llms): POST /api/builders/validate
  app.use('/api', buildersValidationController);

  // Tools routes: POST /api/test-bot-access
  app.use('/api', toolsController);

  // Public scan share: summary JSON + embeddable SVG badge (no auth)
  app.use('/api/share', shareController);
  app.use('/api/badge', badgeController);

  // Public share view (/s/:token): serve the SPA shell with per-scan OG meta
  // injected so social crawlers (LinkedIn/X) unfurl correctly. Humans still boot
  // the SPA and get the interactive view. Falls through if no build exists (dev).
  app.get('/s/:token', async (req, res, next) => {
    try {
      const html = await renderShareHtml(req.params.token);
      if (!html) return next();
      res.status(200).set({ "Content-Type": "text/html; charset=utf-8" }).end(html);
    } catch (error) {
      console.error('[Routes] share view render error:', error);
      next();
    }
  });

  // SEO routes: GET /sitemap.xml
  app.use('/', seoController);

  // Subscription routes: /api/subscriptions/*
  app.use('/api/subscriptions', subscriptionController);

  // Webhook routes: /api/webhooks/*
  // Note: Webhook endpoint needs raw body - configured separately in index.ts
  app.use('/api/webhooks', webhookController);

  // Promotional codes routes: /api/promotional-codes/*
  app.use('/api/promotional-codes', promotionalCodeController);

  app.use(errorHandler);

  const httpServer = createServer(app);

  console.log('[Routes] All routes registered successfully');
  return httpServer;
}
