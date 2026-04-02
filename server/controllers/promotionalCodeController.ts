// server/controllers/promotionalCodeController.ts
// Handles promotional code redemption for free premium subscription periods

import { Router, Response } from "express";
import { z } from "zod";
import { storage } from "../storage.js";
import { requireAuth } from "../auth.js";
import { getStripe } from "../utils/stripe.js";

const router = Router();

// Validation schemas
const redeemCodeSchema = z.object({
  code: z.string().min(1, "Promotional code is required").max(50),
});

const createCodeSchema = z.object({
  code: z.string().min(3).max(50),
  description: z.string().optional(),
  monthsFree: z.number().int().min(1).max(12).default(1),
  expiresAt: z.string().datetime().optional(),
  maxUses: z.number().int().min(1).optional(),
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

  console.log(`[PromoCode] Created Stripe customer ${customer.id} for user ${userId}`);
  return customer.id;
}

/**
 * POST /api/promotional-codes/redeem
 * Redeem a promotional code for free premium subscription time
 */
router.post('/redeem', requireAuth, async (req: any, res: Response) => {
  try {
    const userId = req.user.claims.sub;
    const { code } = redeemCodeSchema.parse(req.body);

    // Look up the promotional code
    const promoCode = await storage.getPromotionalCode(code.toUpperCase());
    
    if (!promoCode) {
      return res.status(404).json({ 
        message: "Invalid promotional code",
        code: "INVALID_CODE"
      });
    }

    // Check if code is active
    if (!promoCode.isActive) {
      return res.status(400).json({ 
        message: "This promotional code is no longer active",
        code: "CODE_INACTIVE"
      });
    }

    // Check if code has expired
    if (promoCode.expiresAt && new Date(promoCode.expiresAt) < new Date()) {
      return res.status(400).json({ 
        message: "This promotional code has expired",
        code: "CODE_EXPIRED"
      });
    }

    // Check usage limits
    if (promoCode.maxUses !== null) {
      const redemptionCount = await storage.getPromotionalCodeRedemptionCount(promoCode.id);
      if (redemptionCount >= promoCode.maxUses) {
        return res.status(400).json({ 
          message: "This promotional code has reached its maximum usage limit",
          code: "CODE_LIMIT_REACHED"
        });
      }
    }

    // Get user's current subscription status
    const existingSubscription = await storage.getUserActiveSubscription(userId);
    const stripe = getStripe();
    
    let subscriptionId: number | null = null;
    let message: string;
    let newPeriodEnd: Date;

    if (existingSubscription) {
      // User has active subscription - extend it
      const currentPeriodEnd = existingSubscription.currentPeriodEnd 
        ? new Date(existingSubscription.currentPeriodEnd)
        : new Date();
      
      // Calculate new end date (add months)
      newPeriodEnd = new Date(currentPeriodEnd);
      newPeriodEnd.setMonth(newPeriodEnd.getMonth() + promoCode.monthsFree);

      // Update subscription in Stripe - extend trial/billing period
      // We use billing_cycle_anchor to shift the next billing date
      try {
        await stripe.subscriptions.update(existingSubscription.stripeSubscriptionId, {
          trial_end: Math.floor(newPeriodEnd.getTime() / 1000),
          proration_behavior: 'none',
        });
      } catch (stripeError: any) {
        // If trial_end fails (subscription may not support it), try pause_collection
        console.log('[PromoCode] Could not set trial_end, trying alternative approach:', stripeError.message);
        
        // For active subscriptions, we'll add free invoice credits
        // Calculate the value of the free months
        const plan = await storage.getSubscriptionPlanByPriceId(existingSubscription.stripePriceId);
        if (plan) {
          const creditAmount = plan.amount * promoCode.monthsFree;
          
          // Create a customer balance transaction (credit)
          const customerId = await getOrCreateStripeCustomer(userId);
          await stripe.customers.createBalanceTransaction(customerId, {
            amount: -creditAmount, // Negative = credit
            currency: plan.currency,
            description: `Promotional code ${promoCode.code}: ${promoCode.monthsFree} month(s) free`,
          });
          
          console.log(`[PromoCode] Added ${creditAmount} ${plan.currency} credit for user ${userId}`);
        }
      }

      // Update local database
      await storage.updateSubscription(existingSubscription.stripeSubscriptionId, {
        currentPeriodEnd: newPeriodEnd,
        trialEnd: newPeriodEnd,
      });

      subscriptionId = existingSubscription.id;
      message = `Your subscription has been extended by ${promoCode.monthsFree} month(s)! New end date: ${newPeriodEnd.toLocaleDateString()}`;

      console.log(`[PromoCode] Extended subscription ${existingSubscription.id} for user ${userId} by ${promoCode.monthsFree} months`);

    } else {
      // User has no subscription - create one with trial period
      const customerId = await getOrCreateStripeCustomer(userId);

      // Get the Guardian plan
      const plans = await storage.getSubscriptionPlans(true);
      const guardianPlan = plans.find(p => p.name?.toLowerCase().includes('guardian'));
      
      if (!guardianPlan) {
        // Fallback to environment variable
        const fallbackPriceId = process.env.VITE_GUARDIAN_PRICE_ID;
        if (!fallbackPriceId) {
          return res.status(500).json({ 
            message: "No subscription plan available. Please contact support.",
            code: "NO_PLAN_AVAILABLE"
          });
        }
      }

      const priceId = guardianPlan?.stripePriceId || process.env.VITE_GUARDIAN_PRICE_ID!;

      // Calculate trial end date
      newPeriodEnd = new Date();
      newPeriodEnd.setMonth(newPeriodEnd.getMonth() + promoCode.monthsFree);

      // Create subscription with trial period (no payment required during trial)
      const stripeSubscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        trial_end: Math.floor(newPeriodEnd.getTime() / 1000),
        payment_behavior: 'default_incomplete',
        payment_settings: {
          save_default_payment_method: 'on_subscription',
        },
        metadata: {
          userId,
          promotionalCode: promoCode.code,
        },
      });

      // Create subscription record in database
      const subscription = await storage.createSubscription({
        userId,
        stripeSubscriptionId: stripeSubscription.id,
        stripePriceId: priceId,
        stripeProductId: guardianPlan?.stripeProductId || null,
        status: 'trialing',
        currentPeriodStart: new Date(),
        currentPeriodEnd: newPeriodEnd,
        trialStart: new Date(),
        trialEnd: newPeriodEnd,
        cancelAtPeriodEnd: false,
      });

      subscriptionId = subscription.id;
      message = `Congratulations! You've unlocked ${promoCode.monthsFree} month(s) of premium service for free! Enjoy your Guardian benefits until ${newPeriodEnd.toLocaleDateString()}.`;

      console.log(`[PromoCode] Created new subscription ${subscription.id} for user ${userId} with ${promoCode.monthsFree} months trial`);
    }

    // Record the redemption
    await storage.createPromotionalCodeRedemption({
      codeId: promoCode.id,
      userId,
      subscriptionId,
    });

    console.log(`[PromoCode] User ${userId} redeemed code ${promoCode.code}`);

    res.json({
      success: true,
      message,
      monthsFree: promoCode.monthsFree,
      newPeriodEnd: newPeriodEnd.toISOString(),
      isNewSubscription: !existingSubscription,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Invalid request", 
        errors: error.errors 
      });
    }

    console.error('[PromoCode] Error redeeming code:', error);
    res.status(500).json({ 
      message: "Failed to redeem promotional code. Please try again.",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * POST /api/promotional-codes/create
 * Admin endpoint: Create a new promotional code
 */
router.post('/create', requireAuth, async (req: any, res: Response) => {
  try {
    const userId = req.user.claims.sub;
    const user = await storage.getUser(userId);
    
    if (!user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    const data = createCodeSchema.parse(req.body);

    const promoCode = await storage.createPromotionalCode({
      code: data.code.toUpperCase(),
      description: data.description,
      monthsFree: data.monthsFree,
      isActive: true,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      maxUses: data.maxUses ?? null,
    });

    console.log(`[PromoCode] Admin ${userId} created promotional code ${promoCode.code}`);

    res.json({
      success: true,
      code: promoCode,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Invalid request", 
        errors: error.errors 
      });
    }

    console.error('[PromoCode] Error creating code:', error);
    res.status(500).json({ 
      message: "Failed to create promotional code",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * GET /api/promotional-codes/validate/:code
 * Check if a promotional code is valid (without redeeming)
 */
router.get('/validate/:code', requireAuth, async (req: any, res: Response) => {
  try {
    const { code } = req.params;
    
    const promoCode = await storage.getPromotionalCode(code.toUpperCase());
    
    if (!promoCode) {
      return res.json({ 
        valid: false, 
        reason: "Invalid promotional code" 
      });
    }

    if (!promoCode.isActive) {
      return res.json({ 
        valid: false, 
        reason: "This code is no longer active" 
      });
    }

    if (promoCode.expiresAt && new Date(promoCode.expiresAt) < new Date()) {
      return res.json({ 
        valid: false, 
        reason: "This code has expired" 
      });
    }

    if (promoCode.maxUses !== null) {
      const redemptionCount = await storage.getPromotionalCodeRedemptionCount(promoCode.id);
      if (redemptionCount >= promoCode.maxUses) {
        return res.json({ 
          valid: false, 
          reason: "This code has reached its usage limit" 
        });
      }
    }

    res.json({
      valid: true,
      monthsFree: promoCode.monthsFree,
      description: promoCode.description,
    });

  } catch (error) {
    console.error('[PromoCode] Error validating code:', error);
    res.status(500).json({ 
      message: "Failed to validate code",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

export default router;

