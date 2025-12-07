// server/routes.ts
// Main route configuration - mounts domain-specific controllers using Express Router

import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth.js";
import { storage } from "./storage.js";
import { ACHIEVEMENTS } from "./gamification.js";

// Import all controllers
import {
  scanController,
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
} from "./controllers/index.js";

// Guard against duplicate auth setup
let authInitialized = false;

export async function registerRoutes(app: Express): Promise<Server> {
  console.log('[Routes] Starting route registration...');
  
  // Validate required environment variables at runtime (not module load)
  // This allows the serverless function to start and return proper errors
  if (!process.env.SESSION_SECRET) {
    console.error('[Routes] FATAL: Missing required environment variable: SESSION_SECRET');
    // Add a fallback route that returns a clear error for ALL routes
    app.all('*', (req, res) => {
      res.status(500).json({ 
        message: 'Server configuration error: SESSION_SECRET not set',
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

  // [GAMIFICATION] Seed achievements on startup
  try {
    console.log('[Routes] Seeding achievements...');
    await storage.createAchievement(ACHIEVEMENTS.ARCHITECT);
    console.log('[Routes] Achievements seeded');
  } catch (error) {
    console.error('[Routes] Error seeding achievements:', error);
    // Don't fail startup for achievement seeding errors
  }

  // ============== Mount Controllers ==============
  
  // Scan routes: POST /api/scan, GET /api/user/scans, GET /api/scans/:id, PATCH /api/scans/:id/tags
  app.use('/api/scan', scanController);           // POST /api/scan (route: /)
  app.use('/api/scans', scanController);          // GET /api/scans/:id, PATCH /api/scans/:id/tags
  app.use('/api/user', scanController);           // GET /api/user/scans (route: /scans)

  // Payment routes: POST /api/create-payment-intent, POST /api/confirm-payment
  app.use('/api', paymentController);

  // Report routes: GET /api/optimization-report/:scanId
  app.use('/api/optimization-report', reportController);

  // Recurring scans routes: /api/recurring-scans/*
  app.use('/api/recurring-scans', recurringScansController);

  // Notification routes: /api/notifications/*
  app.use('/api/notifications', notificationController);

  // Tag routes: GET /api/user/tags
  app.use('/api/user', tagController);

  // Gamification routes: GET /api/user/achievements
  app.use('/api/user', gamificationController);

  // LLMs.txt builder routes: /api/validate-llms-txt, /api/llms-fields/*
  app.use('/api', llmsBuilderController);

  // Robots fields routes: /api/robots-fields/*
  app.use('/api/robots-fields', robotsFieldsController);

  // Tools routes: POST /api/test-bot-access
  app.use('/api', toolsController);

  // SEO routes: GET /sitemap.xml
  app.use('/', seoController);

  const httpServer = createServer(app);

  console.log('[Routes] All routes registered successfully');
  return httpServer;
}
