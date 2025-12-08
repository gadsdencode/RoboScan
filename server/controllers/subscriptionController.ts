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

export default router;
