// server/controllers/llmsBuilderController.ts
// Handles LLMs.txt validation and premium field purchases

import { Router, Response } from "express";
import { z } from "zod";
import { storage } from "../storage.js";
import { isAuthenticated, checkAuthentication } from "../auth.js";
import { ACHIEVEMENTS } from "../gamification.js";
import { getStripe } from "../utils/stripe.js";
import { validateLlmsTxtSchema, fieldKeySchema, paymentIntentIdSchema } from "../utils/validation.js";

const router = Router();

/**
 * POST /api/validate-llms-txt
 * Validate LLMs.txt content and optionally unlock achievement
 */
router.post('/validate-llms-txt', async (req: any, res: Response) => {
  try {
    const { content } = validateLlmsTxtSchema.parse(req.body);

    const errors: string[] = [];

    if (!content.includes('# llms.txt')) {
      errors.push("Missing '# llms.txt' header comment");
    }

    if (!content.includes('# Website:')) {
      errors.push("Missing '# Website:' field");
    }

    if (!content.includes('# Last updated:')) {
      errors.push("Missing '# Last updated:' field");
    }

    if (!content.includes('# About')) {
      errors.push("Missing '# About' section describing the website");
    }

    if (!content.includes('# Preferred Citation Format')) {
      errors.push("Missing '# Preferred Citation Format' section");
    }

    if (!content.includes('# Allowed Bots')) {
      errors.push("Missing '# Allowed Bots' section");
    }

    if (!content.includes('# Key Areas')) {
      errors.push("Missing '# Key Areas' section");
    }

    if (!content.includes('# Content Guidelines')) {
      errors.push("Missing '# Content Guidelines' section");
    }

    if (!content.includes('# Contact')) {
      errors.push("Missing '# Contact' section");
    }

    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    if (!emailRegex.test(content)) {
      errors.push("No valid email address found in the content");
    }

    const urlRegex = /https?:\/\/[^\s]+/;
    if (!urlRegex.test(content)) {
      errors.push("No valid URLs found in the content");
    }

    const isValid = errors.length === 0;
    let achievementUnlocked = false;
    let achievementDetails = null;

    // [GAMIFICATION] Unlock Achievement if valid
    if (isValid && checkAuthentication(req)) {
      const userId = req.user.claims.sub;
      const result = await storage.unlockAchievement(userId, ACHIEVEMENTS.ARCHITECT.key);
      if (result.unlocked) {
        achievementUnlocked = true;
        achievementDetails = result.achievement;
      }
    }

    res.json({
      isValid,
      errors,
      gamification: {
        achievementUnlocked,
        achievement: achievementDetails
      }
    });
  } catch (error) {
    console.error('Validation error:', error);
    res.status(400).json({ 
      isValid: false,
      errors: ["Invalid request format"] 
    });
  }
});

/**
 * GET /api/llms-fields/purchases
 * Get user's purchased premium LLMs fields
 */
router.get('/llms-fields/purchases', isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.user.claims.sub;
    const purchases = await storage.getUserLlmsFieldPurchases(userId);
    res.json(purchases);
  } catch (error) {
    console.error('Get field purchases error:', error);
    res.status(500).json({ message: "Failed to fetch field purchases" });
  }
});

/**
 * POST /api/llms-fields/create-payment-intent
 * Create payment intent for premium LLMs field
 */
router.post('/llms-fields/create-payment-intent', isAuthenticated, async (req: any, res: Response) => {
  try {
    const { fieldKey } = fieldKeySchema.parse(req.body);

    const userId = req.user.claims.sub;

    // Check if already purchased
    const alreadyPurchased = await storage.hasUserPurchasedField(userId, fieldKey);
    if (alreadyPurchased) {
      return res.status(400).json({ message: "Field already purchased" });
    }

    // SECURITY: Look up authoritative pricing from server-side configuration
    const { PREMIUM_LLMS_FIELDS } = await import('../../shared/llms-fields.js');
    const field = PREMIUM_LLMS_FIELDS[fieldKey as keyof typeof PREMIUM_LLMS_FIELDS];
    
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
        type: "llms_premium_field",
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

    console.error('Create payment intent error:', error);
    res.status(500).json({ message: "Failed to create payment intent" });
  }
});

/**
 * POST /api/llms-fields/confirm-payment
 * Confirm premium LLMs field payment
 */
router.post('/llms-fields/confirm-payment', isAuthenticated, async (req: any, res: Response) => {
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
    const existing = await storage.getLlmsFieldPurchaseByPaymentIntent(paymentIntentId);
    if (existing) {
      return res.json({ success: true, fieldKey });
    }

    // SECURITY: Verify pricing against authoritative configuration
    const { PREMIUM_LLMS_FIELDS } = await import('../../shared/llms-fields.js');
    const field = PREMIUM_LLMS_FIELDS[fieldKey as keyof typeof PREMIUM_LLMS_FIELDS];
    
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
    await storage.createLlmsFieldPurchase({
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

    console.error('Confirm payment error:', error);
    res.status(500).json({ message: "Failed to confirm payment" });
  }
});

export default router;
