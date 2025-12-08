// server/controllers/robotsFieldsController.ts
// Handles robots.txt premium field purchases
// NOTE: Premium fields accessible via subscription OR one-time purchase

import { Router, Response } from "express";
import { z } from "zod";
import { storage } from "../storage.js";
import { isAuthenticated } from "../auth.js";
import { getStripe } from "../utils/stripe.js";
import { isAdmin } from "../utils/admin.js";
import { fieldKeySchema, paymentIntentIdSchema } from "../utils/validation.js";

const router = Router();

/**
 * GET /api/robots-fields/purchases
 * Get user's purchased premium robots fields
 * NOTE: Subscribers get access to ALL fields even without individual purchases
 */
router.get('/purchases', isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.user.claims.sub;
    const purchases = await storage.getUserRobotsFieldPurchases(userId);
    
    // Check if user has active subscription (grants all fields)
    const subscription = await storage.getUserActiveSubscription(userId);
    const hasSubscription = !!subscription;
    
    res.json({
      purchases,
      hasSubscription,
      // If subscribed, they have access to all premium fields
      hasAllFieldsAccess: hasSubscription || isAdmin(req),
    });
  } catch (error) {
    console.error('Get robots field purchases error:', error);
    res.status(500).json({ message: "Failed to fetch field purchases" });
  }
});

/**
 * GET /api/robots-fields/access/:fieldKey
 * Check if user has access to a specific field (via subscription OR purchase)
 */
router.get('/access/:fieldKey', isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.user.claims.sub;
    const { fieldKey } = req.params;
    
    // Admin bypass
    if (isAdmin(req)) {
      return res.json({ hasAccess: true, reason: 'admin' });
    }
    
    const accessResult = await storage.hasRobotsFieldAccess(userId, fieldKey);
    res.json(accessResult);
  } catch (error) {
    console.error('Check robots field access error:', error);
    res.status(500).json({ message: "Failed to check field access" });
  }
});

/**
 * POST /api/robots-fields/create-payment-intent
 * Create payment intent for premium robots field
 * NOTE: Subscribers don't need to purchase - they have full access
 */
router.post('/create-payment-intent', isAuthenticated, async (req: any, res: Response) => {
  try {
    const { fieldKey } = fieldKeySchema.parse(req.body);

    const userId = req.user.claims.sub;

    // Check if user has subscription (no payment needed)
    const subscription = await storage.getUserActiveSubscription(userId);
    if (subscription) {
      return res.status(400).json({ 
        message: "You have an active subscription - all premium fields are already unlocked!",
        hasSubscription: true,
        alreadyUnlocked: true 
      });
    }

    // Check if already purchased
    const alreadyPurchased = await storage.hasUserPurchasedRobotsField(userId, fieldKey);
    if (alreadyPurchased) {
      return res.status(400).json({ message: "Field already purchased", alreadyUnlocked: true });
    }

    // SECURITY: Look up authoritative pricing from server-side configuration
    const { PREMIUM_ROBOTS_FIELDS } = await import('../../shared/robots-fields.js');
    const field = PREMIUM_ROBOTS_FIELDS[fieldKey as keyof typeof PREMIUM_ROBOTS_FIELDS];
    
    if (!field) {
      return res.status(400).json({ message: "Invalid field key" });
    }

    const amountInCents = Math.round(field.price * 100);

    const paymentIntent = await getStripe().paymentIntents.create({
      amount: amountInCents,
      currency: "usd",
      metadata: {
        userId,
        fieldKey,
        type: "robots_premium_field",
        xpReward: field.xpReward.toString()
      },
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: "Invalid request",
        errors: error.errors,
      });
    }

    console.error('Create robots field payment intent error:', error);
    res.status(500).json({ message: "Failed to create payment intent" });
  }
});

/**
 * POST /api/robots-fields/confirm-payment
 * Confirm premium robots field payment
 */
router.post('/confirm-payment', isAuthenticated, async (req: any, res: Response) => {
  try {
    const { paymentIntentId } = paymentIntentIdSchema.parse(req.body);

    const userId = req.user.claims.sub;

    const paymentIntent = await getStripe().paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status !== "succeeded") {
      return res.status(400).json({ message: "Payment not completed" });
    }

    // Verify this payment belongs to the current user
    if (paymentIntent.metadata.userId !== userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const fieldKey = paymentIntent.metadata.fieldKey;
    if (!fieldKey) {
      return res.status(400).json({ message: "Invalid payment metadata" });
    }

    // Check if already recorded
    const existing = await storage.getRobotsFieldPurchaseByPaymentIntent(paymentIntentId);
    if (existing) {
      return res.json({ success: true, fieldKey });
    }

    // SECURITY: Verify pricing against authoritative configuration
    const { PREMIUM_ROBOTS_FIELDS } = await import('../../shared/robots-fields.js');
    const field = PREMIUM_ROBOTS_FIELDS[fieldKey as keyof typeof PREMIUM_ROBOTS_FIELDS];
    
    if (!field) {
      return res.status(400).json({ message: "Invalid field key" });
    }

    const expectedAmountInCents = Math.round(field.price * 100);
    
    // Verify the payment amount matches the authoritative price
    if (paymentIntent.amount !== expectedAmountInCents) {
      console.error(`Payment amount mismatch: expected ${expectedAmountInCents}, got ${paymentIntent.amount}`);
      return res.status(400).json({ 
        message: "Payment amount does not match field price" 
      });
    }

    // Record the purchase
    await storage.createRobotsFieldPurchase({
      userId,
      fieldKey,
      stripePaymentIntentId: paymentIntentId,
      amount: paymentIntent.amount,
    });

    // Award XP for the purchase using authoritative XP reward
    const user = await storage.getUser(userId);
    if (user) {
      const currentXp = user.xp || 0;
      const newXp = currentXp + field.xpReward;
      const newLevel = Math.floor(Math.sqrt(newXp / 100)) + 1;
      await storage.updateUserGamificationStats(userId, newXp, newLevel);
    }

    res.json({ success: true, fieldKey });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: "Invalid request",
        errors: error.errors,
      });
    }

    console.error('Confirm robots field payment error:', error);
    res.status(500).json({ message: "Failed to confirm payment" });
  }
});

export default router;
