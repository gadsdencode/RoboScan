// server/routes.ts
// Main route configuration - mounts domain-specific controllers using Express Router

import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth.js";
import { storage } from "./storage.js";
import { ACHIEVEMENTS } from "./gamification.js";
import { getStripe } from "./utils/stripe.js";

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
  subscriptionController,
  webhookController,
} from "./controllers/index.js";

// Guardian subscription plan configuration
const GUARDIAN_PLAN_CONFIG = {
  name: 'Guardian',
  description: 'Complete bot security automation with recurring scans, real-time change alerts, unlimited scan history, all premium builder fields, and 2x XP bonus.',
  amount: 2900, // $29.00 in cents
  currency: 'usd',
  interval: 'month' as const,
  features: [
    'Unlimited Full Scans',
    'Detailed Error Analysis',
    'Recurring Scans (Daily/Weekly/Monthly)',
    'Real-time Change Alerts',
    'Unlimited Scan History',
    'Scan Comparison Tool',
    'All Premium Builder Fields',
    'Unlimited PDF Exports',
    '2x XP Bonus',
    'Priority Support'
  ]
};

/**
 * Seed the Guardian subscription plan in Stripe and database
 * This runs on server startup to ensure the plan exists
 */
async function seedGuardianPlan(): Promise<void> {
  try {
    // Check if Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      console.log('[Routes] STRIPE_SECRET_KEY not set, skipping Guardian plan seeding');
      return;
    }

    const stripe = getStripe();

    // Check if we already have a Guardian plan in the database
    const existingPlans = await storage.getSubscriptionPlans(true);
    const existingGuardian = existingPlans.find(p => 
      p.name?.toLowerCase().includes('guardian') && p.stripePriceId
    );

    if (existingGuardian) {
      // Verify the price still exists and is valid in Stripe
      try {
        const price = await stripe.prices.retrieve(existingGuardian.stripePriceId);
        if (price.active && price.recurring) {
          console.log(`[Routes] Guardian plan already exists: ${existingGuardian.stripePriceId}`);
          return;
        }
      } catch (e) {
        console.log('[Routes] Existing Guardian price invalid, will create new one');
      }
    }

    console.log('[Routes] Seeding Guardian subscription plan...');

    // Look for existing Guardian product in Stripe
    const products = await stripe.products.list({ active: true, limit: 100 });
    let guardianProduct = products.data.find(p => 
      p.name.toLowerCase().includes('guardian')
    );

    // Create product if it doesn't exist
    if (!guardianProduct) {
      console.log('[Routes] Creating Guardian product in Stripe...');
      guardianProduct = await stripe.products.create({
        name: GUARDIAN_PLAN_CONFIG.name,
        description: GUARDIAN_PLAN_CONFIG.description,
        metadata: {
          features: JSON.stringify(GUARDIAN_PLAN_CONFIG.features),
          sort_order: '1'
        }
      });
      console.log(`[Routes] Created Guardian product: ${guardianProduct.id}`);
    }

    // Check if a recurring price already exists for this product
    const existingPrices = await stripe.prices.list({
      product: guardianProduct.id,
      active: true,
      type: 'recurring',
      limit: 10
    });

    let recurringPrice = existingPrices.data.find(p => 
      p.recurring?.interval === GUARDIAN_PLAN_CONFIG.interval &&
      p.unit_amount === GUARDIAN_PLAN_CONFIG.amount &&
      p.currency === GUARDIAN_PLAN_CONFIG.currency
    );

    // Create recurring price if it doesn't exist
    if (!recurringPrice) {
      console.log('[Routes] Creating recurring price for Guardian...');
      recurringPrice = await stripe.prices.create({
        product: guardianProduct.id,
        unit_amount: GUARDIAN_PLAN_CONFIG.amount,
        currency: GUARDIAN_PLAN_CONFIG.currency,
        recurring: {
          interval: GUARDIAN_PLAN_CONFIG.interval,
        },
        metadata: {
          plan_name: 'guardian'
        }
      });
      console.log(`[Routes] Created recurring price: ${recurringPrice.id}`);
    }

    // Save to database
    const plan = await storage.createSubscriptionPlan({
      stripePriceId: recurringPrice.id,
      stripeProductId: guardianProduct.id,
      name: GUARDIAN_PLAN_CONFIG.name,
      description: GUARDIAN_PLAN_CONFIG.description,
      amount: GUARDIAN_PLAN_CONFIG.amount,
      currency: GUARDIAN_PLAN_CONFIG.currency,
      interval: GUARDIAN_PLAN_CONFIG.interval,
      intervalCount: 1,
      features: GUARDIAN_PLAN_CONFIG.features,
      isActive: true,
      sortOrder: 1,
    });

    console.log(`[Routes] Guardian plan seeded successfully: ${plan.stripePriceId}`);
  } catch (error) {
    console.error('[Routes] Error seeding Guardian plan:', error);
    // Don't fail startup for seeding errors
  }
}

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

  // [SUBSCRIPTIONS] Seed Guardian plan on startup
  try {
    await seedGuardianPlan();
  } catch (error) {
    console.error('[Routes] Error in Guardian plan seeding:', error);
    // Don't fail startup for seeding errors
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

  // Subscription routes: /api/subscriptions/*
  app.use('/api/subscriptions', subscriptionController);

  // Webhook routes: /api/webhooks/*
  // Note: Webhook endpoint needs raw body - configured separately in index.ts
  app.use('/api/webhooks', webhookController);

  const httpServer = createServer(app);

  console.log('[Routes] All routes registered successfully');
  return httpServer;
}
