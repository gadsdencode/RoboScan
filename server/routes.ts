// Reference: blueprint:javascript_log_in_with_replit
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { scanWebsite } from "./scanner";
import { generateOptimizationReport } from "./report-generator";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { z } from "zod";
import Stripe from "stripe";

// Validate required environment variables
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

if (!process.env.SESSION_SECRET) {
  throw new Error('Missing required environment variable: SESSION_SECRET');
}

if (!process.env.REPL_ID) {
  throw new Error('Missing required environment variable: REPL_ID');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const scanRequestSchema = z.object({
  url: z.string().min(1, "URL is required"),
});

const createPaymentSchema = z.object({
  scanId: z.number(),
});

// Guard against duplicate auth setup
let authInitialized = false;

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication only once
  if (!authInitialized) {
    await setupAuth(app);
    authInitialized = true;
  }

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Get user's scans (protected)
  app.get('/api/user/scans', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const scans = await storage.getUserScans(userId);
      
      // Add purchase status to each scan (only user's own scans)
      const scansWithPurchaseStatus = await Promise.all(
        scans.map(async (scan) => {
          const purchase = await storage.getPurchaseByScanId(scan.id);
          return {
            ...scan,
            isPurchased: !!purchase,
          };
        })
      );
      
      res.json(scansWithPurchaseStatus);
    } catch (error) {
      console.error("Error fetching user scans:", error);
      res.status(500).json({ message: "Failed to fetch scans" });
    }
  });

  // Scan endpoint (works for both authenticated and anonymous users)
  app.post("/api/scan", async (req: any, res) => {
    try {
      const { url } = scanRequestSchema.parse(req.body);

      const result = await scanWebsite(url);

      // Attach userId if user is authenticated
      const userId = req.isAuthenticated() ? req.user?.claims?.sub : undefined;

      const scan = await storage.createScan({
        userId,
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

  // Create payment intent (works for both authenticated and anonymous users)
  app.post("/api/create-payment-intent", async (req: any, res) => {
    try {
      const { scanId } = createPaymentSchema.parse(req.body);

      const scan = await storage.getScan(scanId);
      if (!scan) {
        return res.status(404).json({ message: "Scan not found" });
      }

      // For authenticated users, verify they own the scan
      if (req.isAuthenticated() && scan.userId) {
        const userId = req.user.claims.sub;
        if (scan.userId !== userId) {
          return res.status(403).json({ 
            message: "You can only purchase reports for your own scans" 
          });
        }
      }

      const existingPurchase = await storage.getPurchaseByScanId(scanId);
      if (existingPurchase) {
        return res.status(400).json({ 
          message: "Report already purchased",
          alreadyPurchased: true 
        });
      }

      const metadata: Record<string, string> = {
        scanId: scanId.toString(),
      };
      
      // Add userId to metadata if user is authenticated
      if (req.isAuthenticated()) {
        metadata.userId = req.user.claims.sub;
      }

      const paymentIntent = await stripe.paymentIntents.create({
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

  // Confirm payment (works for both authenticated and anonymous users)
  app.post("/api/confirm-payment", async (req: any, res) => {
    try {
      const { paymentIntentId } = z.object({
        paymentIntentId: z.string(),
      }).parse(req.body);

      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      // For authenticated users, verify they own the payment
      if (req.isAuthenticated() && paymentIntent.metadata.userId) {
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

  // Get optimization report (requires payment, authentication optional)
  app.get("/api/optimization-report/:scanId", async (req: any, res) => {
    try {
      const scanId = parseInt(req.params.scanId);
      
      const scan = await storage.getScan(scanId);
      if (!scan) {
        return res.status(404).json({ message: "Scan not found" });
      }

      // For authenticated users with owned scans, verify ownership
      if (req.isAuthenticated() && scan.userId) {
        const userId = req.user.claims.sub;
        if (scan.userId !== userId) {
          return res.status(403).json({ 
            message: "You can only access reports for your own scans" 
          });
        }
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
