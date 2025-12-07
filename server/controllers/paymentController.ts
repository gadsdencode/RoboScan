// server/controllers/paymentController.ts
// Handles Stripe payment routes for optimization reports

import { Router, Response } from "express";
import { z } from "zod";
import { storage } from "../storage.js";
import { checkAuthentication } from "../auth.js";
import { getStripe } from "../utils/stripe.js";
import { isAdmin } from "../utils/admin.js";
import { createPaymentSchema, paymentIntentIdSchema } from "../utils/validation.js";

const router = Router();

/**
 * POST /api/create-payment-intent
 * Create payment intent for optimization report (works for both authenticated and anonymous users)
 */
router.post('/create-payment-intent', async (req: any, res: Response) => {
  try {
    const { scanId } = createPaymentSchema.parse(req.body);

    const scan = await storage.getScan(scanId);
    if (!scan) {
      return res.status(404).json({ message: "Scan not found" });
    }

    // For authenticated users, verify they own the scan
    const isAuth = checkAuthentication(req);
    if (isAuth && scan.userId) {
      const userId = req.user.claims.sub;
      if (scan.userId !== userId) {
        return res.status(403).json({ 
          message: "You can only purchase reports for your own scans" 
        });
      }
    }

    const existingPurchase = await storage.getPurchaseByScanId(scanId);
    
    // GOD MODE: If admin, tell the frontend it's already paid
    if (existingPurchase || isAdmin(req)) {
      return res.status(400).json({ 
        message: "Report already purchased",
        alreadyPurchased: true 
      });
    }

    const metadata: Record<string, string> = {
      scanId: scanId.toString(),
    };
    
    // Add userId to metadata if user is authenticated
    if (isAuth) {
      metadata.userId = req.user.claims.sub;
    }

    const paymentIntent = await getStripe().paymentIntents.create({
      amount: 999,
      currency: "usd",
      metadata,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    res.json({ 
      clientSecret: paymentIntent.client_secret,
      amount: 9.99
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Invalid request", 
        errors: error.errors 
      });
    }
    
    console.error('Payment intent error:', error);
    res.status(500).json({ 
      message: "Failed to create payment intent",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * POST /api/confirm-payment
 * Confirm payment and record purchase (works for both authenticated and anonymous users)
 */
router.post('/confirm-payment', async (req: any, res: Response) => {
  try {
    const { paymentIntentId } = paymentIntentIdSchema.parse(req.body);

    const paymentIntent = await getStripe().paymentIntents.retrieve(paymentIntentId);
    
    // For authenticated users, verify they own the payment
    const isAuth = checkAuthentication(req);
    if (isAuth && paymentIntent.metadata.userId) {
      const userId = req.user.claims.sub;
      if (paymentIntent.metadata.userId !== userId) {
        return res.status(403).json({ 
          message: "Unauthorized: This payment belongs to another user" 
        });
      }
    }
    
    if (paymentIntent.status === 'succeeded') {
      const scanId = parseInt(paymentIntent.metadata.scanId);
      
      const existingPurchase = await storage.getPurchaseByPaymentIntent(paymentIntentId);
      if (!existingPurchase) {
        await storage.createPurchase({
          scanId,
          stripePaymentIntentId: paymentIntentId,
          amount: (paymentIntent.amount / 100).toFixed(2),
          currency: paymentIntent.currency,
          status: paymentIntent.status,
        });
      }

      res.json({ success: true, scanId });
    } else {
      res.json({ success: false, status: paymentIntent.status });
    }
  } catch (error) {
    console.error('Payment confirmation error:', error);
    res.status(500).json({ 
      message: "Failed to confirm payment",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

export default router;
