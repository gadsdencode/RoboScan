import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { scanWebsite } from "./scanner";
import { generateOptimizationReport } from "./report-generator";
import { z } from "zod";
import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const scanRequestSchema = z.object({
  url: z.string().min(1, "URL is required"),
});

const createPaymentSchema = z.object({
  scanId: z.number(),
});

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/scan", async (req, res) => {
    try {
      const { url } = scanRequestSchema.parse(req.body);

      const result = await scanWebsite(url);

      const scan = await storage.createScan({
        url,
        robotsTxtFound: result.robotsTxtFound,
        robotsTxtContent: result.robotsTxtContent,
        llmsTxtFound: result.llmsTxtFound,
        llmsTxtContent: result.llmsTxtContent,
        botPermissions: result.botPermissions,
        errors: result.errors,
        warnings: result.warnings,
      });

      res.json({
        id: scan.id,
        url: scan.url,
        robotsTxtFound: scan.robotsTxtFound,
        robotsTxtContent: scan.robotsTxtContent,
        llmsTxtFound: scan.llmsTxtFound,
        llmsTxtContent: scan.llmsTxtContent,
        botPermissions: scan.botPermissions,
        errors: scan.errors,
        warnings: scan.warnings,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid request", 
          errors: error.errors 
        });
      }
      
      console.error('Scan error:', error);
      res.status(500).json({ 
        message: "Failed to scan website",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/create-payment-intent", async (req, res) => {
    try {
      const { scanId } = createPaymentSchema.parse(req.body);

      const scan = await storage.getScan(scanId);
      if (!scan) {
        return res.status(404).json({ message: "Scan not found" });
      }

      const existingPurchase = await storage.getPurchaseByScanId(scanId);
      if (existingPurchase) {
        return res.status(400).json({ 
          message: "Report already purchased",
          alreadyPurchased: true 
        });
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: 999,
        currency: "usd",
        metadata: {
          scanId: scanId.toString(),
        },
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

  app.post("/api/confirm-payment", async (req, res) => {
    try {
      const { paymentIntentId } = z.object({
        paymentIntentId: z.string(),
      }).parse(req.body);

      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
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

  app.get("/api/optimization-report/:scanId", async (req, res) => {
    try {
      const scanId = parseInt(req.params.scanId);
      
      const scan = await storage.getScan(scanId);
      if (!scan) {
        return res.status(404).json({ message: "Scan not found" });
      }

      const purchase = await storage.getPurchaseByScanId(scanId);
      if (!purchase) {
        return res.status(403).json({ 
          message: "Payment required to access optimization report",
          requiresPayment: true 
        });
      }

      const report = generateOptimizationReport(scan);
      
      res.json({
        scan,
        report,
        purchasedAt: purchase.createdAt,
      });
    } catch (error) {
      console.error('Report generation error:', error);
      res.status(500).json({ 
        message: "Failed to generate report",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
