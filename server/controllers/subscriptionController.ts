// server/controllers/subscriptionController.ts
// Handles Stripe subscription management: customer creation, checkout sessions, subscription management

import { Router, Response } from "express";
import { z } from "zod";
import { storage } from "../storage.js";
import { requireAuth } from "../auth.js";
import { getStripe } from "../utils/stripe.js";
import Stripe from "stripe";

const router = Router();

// Validation schemas
const createCheckoutSessionSchema = z.object({
  priceId: z.string().min(1, "Price ID is required"),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

const createPortalSessionSchema = z.object({
  returnUrl: z.string().url().optional(),
});

/**
 * Helper: Get or create Stripe customer for a user
 */
async function getOrCreateStripeCustomer(userId: string): Promise<string> {
  const user = await storage.getUser(userId);
  if (!user) {
    throw new Error("User not found");
  }

  // If user already has a Stripe customer ID, return it
  if (user.stripeCustomerId) {
    return user.stripeCustomerId;
  }

  // Create a new Stripe customer
  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email: user.email || undefined,
    name: [user.firstName, user.lastName].filter(Boolean).join(" ") || undefined,
    metadata: {
      userId: user.id,
    },
  });

  // Save the customer ID to the database
  await storage.updateUserStripeCustomerId(userId, customer.id);

  console.log(`[Subscription] Created Stripe customer ${customer.id} for user ${userId}`);
  return customer.id;
}

/**
 * GET /api/subscriptions/plans
 * Get available subscription plans
 */
router.get('/plans', async (req: any, res: Response) => {
  try {
    const plans = await storage.getSubscriptionPlans(true);
    res.json({ plans });
  } catch (error) {
    console.error('[Subscription] Error fetching plans:', error);
    res.status(500).json({ 
      message: "Failed to fetch subscription plans",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * GET /api/subscriptions/current
 * Get the current user's active subscription
 */
router.get('/current', requireAuth, async (req: any, res: Response) => {
  try {
    const userId = req.user.claims.sub;
    
    const subscription = await storage.getUserActiveSubscription(userId);
    
    if (!subscription) {
      return res.json({ subscription: null, hasActiveSubscription: false });
    }

    // Get plan details
    const plan = await storage.getSubscriptionPlanByPriceId(subscription.stripePriceId);

    res.json({ 
      subscription,
      plan,
      hasActiveSubscription: true 
    });
  } catch (error) {
    console.error('[Subscription] Error fetching current subscription:', error);
    res.status(500).json({ 
      message: "Failed to fetch subscription",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * GET /api/subscriptions/history
 * Get the current user's subscription history
 */
router.get('/history', requireAuth, async (req: any, res: Response) => {
  try {
    const userId = req.user.claims.sub;
    const subscriptions = await storage.getUserSubscriptions(userId);
    
    res.json({ subscriptions });
  } catch (error) {
    console.error('[Subscription] Error fetching subscription history:', error);
    res.status(500).json({ 
      message: "Failed to fetch subscription history",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * POST /api/subscriptions/create-checkout-session
 * Create a Stripe Checkout session for subscription
 */
router.post('/create-checkout-session', requireAuth, async (req: any, res: Response) => {
  try {
    const userId = req.user.claims.sub;
    const { priceId, successUrl, cancelUrl } = createCheckoutSessionSchema.parse(req.body);

    // Check if user already has an active subscription
    const existingSubscription = await storage.getUserActiveSubscription(userId);
    if (existingSubscription) {
      return res.status(400).json({ 
        message: "You already have an active subscription. Please manage it from your account settings.",
        hasActiveSubscription: true
      });
    }

    // Get or create Stripe customer
    const customerId = await getOrCreateStripeCustomer(userId);

    // Create Checkout session
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl || `${process.env.APP_URL || 'http://localhost:5000'}/dashboard?subscription=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.APP_URL || 'http://localhost:5000'}/pricing?subscription=canceled`,
      metadata: {
        userId,
      },
      subscription_data: {
        metadata: {
          userId,
        },
      },
      // Allow promotion codes
      allow_promotion_codes: true,
    });

    console.log(`[Subscription] Created checkout session ${session.id} for user ${userId}`);

    res.json({ 
      sessionId: session.id,
      url: session.url 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Invalid request", 
        errors: error.errors 
      });
    }

    console.error('[Subscription] Error creating checkout session:', error);
    res.status(500).json({ 
      message: "Failed to create checkout session",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * POST /api/subscriptions/create-portal-session
 * Create a Stripe Customer Portal session for subscription management
 */
router.post('/create-portal-session', requireAuth, async (req: any, res: Response) => {
  try {
    const userId = req.user.claims.sub;
    const { returnUrl } = createPortalSessionSchema.parse(req.body);

    const user = await storage.getUser(userId);
    if (!user?.stripeCustomerId) {
      return res.status(400).json({ 
        message: "No subscription found. Please subscribe first." 
      });
    }

    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: returnUrl || `${process.env.APP_URL || 'http://localhost:5000'}/dashboard`,
    });

    console.log(`[Subscription] Created portal session for user ${userId}`);

    res.json({ url: session.url });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Invalid request", 
        errors: error.errors 
      });
    }

    console.error('[Subscription] Error creating portal session:', error);
    res.status(500).json({ 
      message: "Failed to create portal session",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * POST /api/subscriptions/cancel
 * Cancel the current subscription at period end
 */
router.post('/cancel', requireAuth, async (req: any, res: Response) => {
  try {
    const userId = req.user.claims.sub;

    const subscription = await storage.getUserActiveSubscription(userId);
    if (!subscription) {
      return res.status(404).json({ 
        message: "No active subscription found" 
      });
    }

    const stripe = getStripe();
    const updatedSubscription = await stripe.subscriptions.update(
      subscription.stripeSubscriptionId,
      { cancel_at_period_end: true }
    );

    // Update local record
    await storage.updateSubscription(subscription.stripeSubscriptionId, {
      cancelAtPeriodEnd: true,
    });

    console.log(`[Subscription] Subscription ${subscription.stripeSubscriptionId} scheduled for cancellation`);

    res.json({ 
      message: "Subscription will be canceled at the end of the billing period",
      cancelAt: updatedSubscription.cancel_at,
      currentPeriodEnd: subscription.currentPeriodEnd
    });
  } catch (error) {
    console.error('[Subscription] Error canceling subscription:', error);
    res.status(500).json({ 
      message: "Failed to cancel subscription",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * POST /api/subscriptions/reactivate
 * Reactivate a subscription that was scheduled for cancellation
 */
router.post('/reactivate', requireAuth, async (req: any, res: Response) => {
  try {
    const userId = req.user.claims.sub;

    const subscription = await storage.getUserActiveSubscription(userId);
    if (!subscription) {
      return res.status(404).json({ 
        message: "No active subscription found" 
      });
    }

    if (!subscription.cancelAtPeriodEnd) {
      return res.status(400).json({ 
        message: "Subscription is not scheduled for cancellation" 
      });
    }

    const stripe = getStripe();
    await stripe.subscriptions.update(
      subscription.stripeSubscriptionId,
      { cancel_at_period_end: false }
    );

    // Update local record
    await storage.updateSubscription(subscription.stripeSubscriptionId, {
      cancelAtPeriodEnd: false,
    });

    console.log(`[Subscription] Subscription ${subscription.stripeSubscriptionId} reactivated`);

    res.json({ 
      message: "Subscription has been reactivated" 
    });
  } catch (error) {
    console.error('[Subscription] Error reactivating subscription:', error);
    res.status(500).json({ 
      message: "Failed to reactivate subscription",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * POST /api/subscriptions/sync-plans
 * Admin endpoint: Sync subscription plans from Stripe
 * This fetches active prices from Stripe and updates local plan records
 */
router.post('/sync-plans', requireAuth, async (req: any, res: Response) => {
  try {
    const userId = req.user.claims.sub;
    const user = await storage.getUser(userId);
    
    if (!user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    const stripe = getStripe();
    
    // Fetch active recurring prices from Stripe
    const prices = await stripe.prices.list({
      active: true,
      type: 'recurring',
      expand: ['data.product'],
      limit: 100,
    });

    const syncedPlans: any[] = [];

    for (const price of prices.data) {
      const product = price.product as Stripe.Product;
      
      if (typeof product === 'string' || !product.active) {
        continue;
      }

      const plan = await storage.createSubscriptionPlan({
        stripePriceId: price.id,
        stripeProductId: product.id,
        name: product.name,
        description: product.description || null,
        amount: price.unit_amount || 0,
        currency: price.currency,
        interval: price.recurring?.interval || 'month',
        intervalCount: price.recurring?.interval_count || 1,
        features: (product.metadata?.features ? JSON.parse(product.metadata.features) : []),
        isActive: true,
        sortOrder: parseInt(product.metadata?.sort_order || '0', 10),
      });

      syncedPlans.push(plan);
    }

    console.log(`[Subscription] Synced ${syncedPlans.length} plans from Stripe`);

    res.json({ 
      message: `Synced ${syncedPlans.length} subscription plans`,
      plans: syncedPlans 
    });
  } catch (error) {
    console.error('[Subscription] Error syncing plans:', error);
    res.status(500).json({ 
      message: "Failed to sync subscription plans",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * POST /api/subscriptions/seed-guardian
 * Admin endpoint: Create the Guardian subscription plan in Stripe and database
 * This creates a recurring price if one doesn't exist, then saves to database
 */
router.post('/seed-guardian', requireAuth, async (req: any, res: Response) => {
  try {
    const userId = req.user.claims.sub;
    const user = await storage.getUser(userId);
    
    if (!user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    const stripe = getStripe();
    
    // Guardian plan configuration
    const GUARDIAN_CONFIG = {
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

    // Check if we already have a Guardian plan with recurring price
    const existingPlans = await storage.getSubscriptionPlans(true);
    const existingGuardian = existingPlans.find(p => 
      p.name?.toLowerCase().includes('guardian') && p.stripePriceId
    );
    
    if (existingGuardian) {
      // Verify the price still exists in Stripe
      try {
        const price = await stripe.prices.retrieve(existingGuardian.stripePriceId);
        if (price.active && price.recurring) {
          return res.json({
            message: 'Guardian plan already exists',
            plan: existingGuardian,
            priceId: existingGuardian.stripePriceId
          });
        }
      } catch (e) {
        console.log('[Subscription] Existing price invalid, will create new one');
      }
    }

    // Look for existing Guardian product in Stripe
    const products = await stripe.products.list({ active: true, limit: 100 });
    let guardianProduct = products.data.find(p => 
      p.name.toLowerCase().includes('guardian')
    );

    // Create product if it doesn't exist
    if (!guardianProduct) {
      console.log('[Subscription] Creating Guardian product in Stripe...');
      guardianProduct = await stripe.products.create({
        name: GUARDIAN_CONFIG.name,
        description: GUARDIAN_CONFIG.description,
        metadata: {
          features: JSON.stringify(GUARDIAN_CONFIG.features),
          sort_order: '1'
        }
      });
      console.log(`[Subscription] Created Guardian product: ${guardianProduct.id}`);
    }

    // Check if a recurring price already exists for this product
    const existingPrices = await stripe.prices.list({
      product: guardianProduct.id,
      active: true,
      type: 'recurring',
      limit: 10
    });

    let recurringPrice = existingPrices.data.find(p => 
      p.recurring?.interval === GUARDIAN_CONFIG.interval &&
      p.unit_amount === GUARDIAN_CONFIG.amount &&
      p.currency === GUARDIAN_CONFIG.currency
    );

    // Create recurring price if it doesn't exist
    if (!recurringPrice) {
      console.log('[Subscription] Creating recurring price for Guardian...');
      recurringPrice = await stripe.prices.create({
        product: guardianProduct.id,
        unit_amount: GUARDIAN_CONFIG.amount,
        currency: GUARDIAN_CONFIG.currency,
        recurring: {
          interval: GUARDIAN_CONFIG.interval,
        },
        metadata: {
          plan_name: 'guardian'
        }
      });
      console.log(`[Subscription] Created recurring price: ${recurringPrice.id}`);
    }

    // Save to database
    const plan = await storage.createSubscriptionPlan({
      stripePriceId: recurringPrice.id,
      stripeProductId: guardianProduct.id,
      name: GUARDIAN_CONFIG.name,
      description: GUARDIAN_CONFIG.description,
      amount: GUARDIAN_CONFIG.amount,
      currency: GUARDIAN_CONFIG.currency,
      interval: GUARDIAN_CONFIG.interval,
      intervalCount: 1,
      features: GUARDIAN_CONFIG.features,
      isActive: true,
      sortOrder: 1,
    });

    console.log(`[Subscription] Guardian plan seeded successfully: ${plan.id}`);

    res.json({
      message: 'Guardian plan created successfully',
      plan,
      priceId: recurringPrice.id,
      productId: guardianProduct.id,
      instructions: `Set VITE_GUARDIAN_PRICE_ID=${recurringPrice.id} in your environment variables for fallback support.`
    });
  } catch (error) {
    console.error('[Subscription] Error seeding Guardian plan:', error);
    res.status(500).json({ 
      message: "Failed to seed Guardian plan",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * GET /api/subscriptions/debug
 * Debug endpoint: Show current Stripe and database state
 */
router.get('/debug', requireAuth, async (req: any, res: Response) => {
  try {
    const userId = req.user.claims.sub;
    const user = await storage.getUser(userId);
    
    if (!user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    const stripe = getStripe();
    
    // Get database plans
    const dbPlans = await storage.getSubscriptionPlans(false);
    
    // Get Stripe products and prices
    const products = await stripe.products.list({ active: true, limit: 20 });
    const recurringPrices = await stripe.prices.list({ 
      active: true, 
      type: 'recurring', 
      expand: ['data.product'],
      limit: 20 
    });
    const oneTimePrices = await stripe.prices.list({ 
      active: true, 
      type: 'one_time',
      limit: 20 
    });

    res.json({
      database: {
        plans: dbPlans,
        count: dbPlans.length
      },
      stripe: {
        products: products.data.map(p => ({ 
          id: p.id, 
          name: p.name, 
          active: p.active 
        })),
        recurringPrices: recurringPrices.data.map(p => ({
          id: p.id,
          product: typeof p.product === 'string' 
            ? p.product 
            : (p.product && 'name' in p.product ? p.product.name : p.product?.id),
          amount: p.unit_amount,
          currency: p.currency,
          interval: p.recurring?.interval
        })),
        oneTimePrices: oneTimePrices.data.map(p => ({
          id: p.id,
          product: p.product,
          amount: p.unit_amount,
          currency: p.currency
        }))
      },
      environment: {
        VITE_GUARDIAN_PRICE_ID: process.env.VITE_GUARDIAN_PRICE_ID || 'not set',
        hasStripeKey: !!process.env.STRIPE_SECRET_KEY
      }
    });
  } catch (error) {
    console.error('[Subscription] Debug error:', error);
    res.status(500).json({ 
      message: "Debug failed",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

export default router;
