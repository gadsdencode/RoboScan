// Reference: blueprint:javascript_log_in_with_replit
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { scanWebsite } from "./scanner";
import { generateOptimizationReport } from "./report-generator";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { z } from "zod";
import Stripe from "stripe";
import { getBotUserAgent } from "@shared/bot-user-agents";

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

function calculateLevel(totalXp: number): number {
  // Curve: Level 1 starts at 0 XP.
  // Level 2 = 100 XP
  // Level 3 = 400 XP
  // Level 4 = 900 XP
  // Formula: Level = floor(sqrt(XP / 100)) + 1
  return Math.floor(Math.sqrt(totalXp / 100)) + 1;
}

function parsePositiveInt(value: any, defaultValue: number, min: number = 1, max: number = 100): number {
  const parsed = parseInt(value);
  if (isNaN(parsed) || parsed < min) return defaultValue;
  return Math.min(parsed, max);
}

function parseNonNegativeInt(value: any, defaultValue: number): number {
  const parsed = parseInt(value);
  if (isNaN(parsed) || parsed < 0) return defaultValue;
  return parsed;
}

const createPaymentSchema = z.object({
  scanId: z.number(),
});

// Helper to check if the current user is an admin
// Set ADMIN_EMAILS in your environment variables as a comma-separated list
// Example: ADMIN_EMAILS="investor@example.com,me@roboscan.com"
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase());

function isAdmin(req: any): boolean {
  if (!req.isAuthenticated() || !req.user?.claims?.email) return false;
  return ADMIN_EMAILS.includes(req.user.claims.email.toLowerCase());
}

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
      
      // Parse tag filter from query params
      const tagFilter = req.query.tags ? 
        (Array.isArray(req.query.tags) ? req.query.tags : [req.query.tags]) : 
        undefined;
      
      // Parse pagination params with validation
      const limit = parsePositiveInt(req.query.limit, 50, 1, 100);
      const offset = parseNonNegativeInt(req.query.offset, 0);
      
      const scans = await storage.getUserScans(userId, tagFilter, limit, offset);
      
      // Add purchase status to each scan (only user's own scans)
      const scansWithPurchaseStatus = await Promise.all(
        scans.map(async (scan) => {
          const purchase = await storage.getPurchaseByScanId(scan.id);
          
          // GOD MODE: If admin, force isPurchased to true
          const isPurchased = !!purchase || isAdmin(req);
          
          return {
            ...scan,
            isPurchased,
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

      // Gamification: XP Logic Injection
      let gamificationUpdates = null;
      
      if (userId) {
        const currentUser = await storage.getUser(userId);
        
        if (currentUser) {
          // Base Reward: 10 XP for performing a scan
          let xpGain = 10;

          // Bonus Reward: +40 XP for a "Perfect Scan" (Total 50)
          // Encourages users to fix their sites to see the green checkmarks
          if (result.robotsTxtFound && result.llmsTxtFound) {
            xpGain += 40; 
          }

          const currentXp = currentUser.xp || 0;
          const newXp = currentXp + xpGain;
          const newLevel = calculateLevel(newXp);
          const oldLevel = currentUser.level || 1;

          // Update Database
          await storage.updateUserGamificationStats(userId, newXp, newLevel);

          // Prepare data for frontend toast/notification
          gamificationUpdates = {
            xpGained: xpGain,
            totalXp: newXp,
            newLevel: newLevel,
            levelUp: newLevel > oldLevel
          };
        }
      }

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
        gamification: gamificationUpdates,
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
      
      // GOD MODE: Allow access if purchase exists OR if user is admin
      if (!purchase && !isAdmin(req)) {
        return res.status(403).json({ 
          message: "Payment required to access optimization report",
          requiresPayment: true 
        });
      }

      const report = generateOptimizationReport(scan);
      
      res.json({
        scan,
        report,
        purchasedAt: purchase?.createdAt || null,
      });
    } catch (error) {
      console.error('Report generation error:', error);
      res.status(500).json({ 
        message: "Failed to generate report",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Recurring scans routes (require authentication)
  app.post("/api/recurring-scans", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { url, frequency, notificationPreferences } = z.object({
        url: z.string().min(1),
        frequency: z.enum(['daily', 'weekly', 'monthly']),
        notificationPreferences: z.object({
          notifyOnRobotsTxtChange: z.boolean().default(true),
          notifyOnLlmsTxtChange: z.boolean().default(true),
          notifyOnBotPermissionChange: z.boolean().default(true),
          notifyOnNewErrors: z.boolean().default(true),
          notificationMethod: z.enum(['in-app', 'email', 'both']).default('in-app'),
        }).optional(),
      }).parse(req.body);

      const nextRunAt = new Date(Date.now() + 60 * 1000); // First run in 1 minute

      const recurringScan = await storage.createRecurringScan({
        userId,
        url,
        frequency,
        isActive: true,
        nextRunAt,
      });

      // Create notification preferences
      await storage.createNotificationPreference({
        recurringScanId: recurringScan.id,
        notifyOnRobotsTxtChange: notificationPreferences?.notifyOnRobotsTxtChange ?? true,
        notifyOnLlmsTxtChange: notificationPreferences?.notifyOnLlmsTxtChange ?? true,
        notifyOnBotPermissionChange: notificationPreferences?.notifyOnBotPermissionChange ?? true,
        notifyOnNewErrors: notificationPreferences?.notifyOnNewErrors ?? true,
        notificationMethod: notificationPreferences?.notificationMethod ?? 'in-app',
      });

      res.json(recurringScan);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request", errors: error.errors });
      }
      console.error('Create recurring scan error:', error);
      res.status(500).json({ message: "Failed to create recurring scan" });
    }
  });

  app.get("/api/recurring-scans", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const scans = await storage.getUserRecurringScans(userId);
      res.json(scans);
    } catch (error) {
      console.error('Get recurring scans error:', error);
      res.status(500).json({ message: "Failed to get recurring scans" });
    }
  });

  app.patch("/api/recurring-scans/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      
      const recurringScan = await storage.getRecurringScan(id);
      if (!recurringScan || recurringScan.userId !== userId) {
        return res.status(404).json({ message: "Recurring scan not found" });
      }

      const { isActive, frequency } = z.object({
        isActive: z.boolean().optional(),
        frequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
      }).parse(req.body);

      // Only include defined fields
      const updates: any = {};
      if (isActive !== undefined) updates.isActive = isActive;
      if (frequency !== undefined) updates.frequency = frequency;

      const updated = await storage.updateRecurringScan(id, updates);

      res.json(updated);
    } catch (error) {
      console.error('Update recurring scan error:', error);
      res.status(500).json({ message: "Failed to update recurring scan" });
    }
  });

  app.delete("/api/recurring-scans/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      
      const recurringScan = await storage.getRecurringScan(id);
      if (!recurringScan || recurringScan.userId !== userId) {
        return res.status(404).json({ message: "Recurring scan not found" });
      }

      await storage.deleteRecurringScan(id);
      res.json({ success: true });
    } catch (error) {
      console.error('Delete recurring scan error:', error);
      res.status(500).json({ message: "Failed to delete recurring scan" });
    }
  });

  // Notification routes (require authentication)
  app.get("/api/notifications", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limit = parsePositiveInt(req.query.limit, 50, 1, 100);
      const offset = parseNonNegativeInt(req.query.offset, 0);
      const notifications = await storage.getUserNotifications(userId, limit, offset);
      res.json(notifications);
    } catch (error) {
      console.error('Get notifications error:', error);
      res.status(500).json({ message: "Failed to get notifications" });
    }
  });

  app.get("/api/notifications/unread-count", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const count = await storage.getUnreadNotificationCount(userId);
      res.json({ count });
    } catch (error) {
      console.error('Get unread count error:', error);
      res.status(500).json({ message: "Failed to get unread count" });
    }
  });

  app.patch("/api/notifications/:id/read", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.markNotificationAsRead(id);
      res.json({ success: true });
    } catch (error) {
      console.error('Mark notification read error:', error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.post("/api/notifications/mark-all-read", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.markAllNotificationsAsRead(userId);
      res.json({ success: true });
    } catch (error) {
      console.error('Mark all read error:', error);
      res.status(500).json({ message: "Failed to mark all as read" });
    }
  });

  app.get("/api/recurring-scans/:id/preferences", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      
      const recurringScan = await storage.getRecurringScan(id);
      if (!recurringScan) {
        return res.status(404).json({ message: "Recurring scan not found" });
      }

      // Security: Verify ownership
      if (recurringScan.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const prefs = await storage.getNotificationPreferenceByRecurringScanId(id);
      res.json(prefs);
    } catch (error) {
      console.error('Get preferences error:', error);
      res.status(500).json({ message: "Failed to get preferences" });
    }
  });

  app.patch("/api/recurring-scans/:id/preferences", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      
      const recurringScan = await storage.getRecurringScan(id);
      if (!recurringScan) {
        return res.status(404).json({ message: "Recurring scan not found" });
      }

      // Security: Verify ownership
      if (recurringScan.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const prefs = await storage.getNotificationPreferenceByRecurringScanId(id);
      if (!prefs) {
        return res.status(404).json({ message: "Preferences not found" });
      }

      const parsed = z.object({
        notifyOnRobotsTxtChange: z.boolean().optional(),
        notifyOnLlmsTxtChange: z.boolean().optional(),
        notifyOnBotPermissionChange: z.boolean().optional(),
        notifyOnNewErrors: z.boolean().optional(),
        notificationMethod: z.enum(['in-app', 'email', 'both']).optional(),
      }).parse(req.body);

      // Only include defined fields
      const updates: any = {};
      if (parsed.notifyOnRobotsTxtChange !== undefined) updates.notifyOnRobotsTxtChange = parsed.notifyOnRobotsTxtChange;
      if (parsed.notifyOnLlmsTxtChange !== undefined) updates.notifyOnLlmsTxtChange = parsed.notifyOnLlmsTxtChange;
      if (parsed.notifyOnBotPermissionChange !== undefined) updates.notifyOnBotPermissionChange = parsed.notifyOnBotPermissionChange;
      if (parsed.notifyOnNewErrors !== undefined) updates.notifyOnNewErrors = parsed.notifyOnNewErrors;
      if (parsed.notificationMethod !== undefined) updates.notificationMethod = parsed.notificationMethod;

      const updated = await storage.updateNotificationPreference(prefs.id, updates);
      res.json(updated);
    } catch (error) {
      console.error('Update preferences error:', error);
      res.status(500).json({ message: "Failed to update preferences" });
    }
  });

  // Tag management routes (require authentication)
  app.patch("/api/scans/:id/tags", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const scanId = parseInt(req.params.id);
      
      const scan = await storage.getScan(scanId);
      if (!scan) {
        return res.status(404).json({ message: "Scan not found" });
      }

      // Security: Verify ownership
      if (scan.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const { tags } = z.object({
        tags: z.array(z.string()).default([]),
      }).parse(req.body);

      // Normalize tags: trim, lowercase, deduplicate
      const normalizedTags = Array.from(
        new Set(
          tags
            .map(tag => tag.trim().toLowerCase())
            .filter(tag => tag.length > 0)
        )
      );

      const updatedScan = await storage.updateScanTags(scanId, normalizedTags);
      res.json(updatedScan);
    } catch (error) {
      console.error('Update tags error:', error);
      res.status(500).json({ message: "Failed to update tags" });
    }
  });

  app.get("/api/user/tags", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tags = await storage.getAllUserTags(userId);
      res.json(tags);
    } catch (error) {
      console.error('Get tags error:', error);
      res.status(500).json({ message: "Failed to get tags" });
    }
  });

  app.post("/api/validate-llms-txt", async (req, res) => {
    try {
      const { content } = z.object({
        content: z.string().min(1, "Content is required"),
      }).parse(req.body);

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

      res.json({
        isValid,
        errors,
      });
    } catch (error) {
      console.error('Validation error:', error);
      res.status(400).json({ 
        isValid: false,
        errors: ["Invalid request format"] 
      });
    }
  });

  app.post("/api/test-bot-access", async (req, res) => {
    try {
      const { url, botName } = z.object({
        url: z.string().url("Invalid URL"),
        botName: z.string().min(1, "Bot name is required"),
      }).parse(req.body);

      const botUserAgent = getBotUserAgent(botName);

      try {
        const response = await fetch(url, {
          method: 'HEAD',
          headers: {
            'User-Agent': botUserAgent,
          },
          redirect: 'follow',
          signal: AbortSignal.timeout(10000),
        });

        res.json({
          status: response.status,
          accessible: response.ok,
          statusText: response.statusText,
        });
      } catch (fetchError) {
        console.error('Bot access test error:', fetchError);
        res.json({
          status: 0,
          accessible: false,
          statusText: "Connection failed",
          error: fetchError instanceof Error ? fetchError.message : "Unknown error",
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Invalid request",
          errors: error.errors,
        });
      }

      console.error('Test bot access error:', error);
      res.status(500).json({
        message: "Failed to test bot access",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Sitemap route for SEO
  app.get("/sitemap.xml", (req, res) => {
    const baseUrl = "https://" + req.get("host");
    
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/tools/llms-builder</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>`;

    res.header("Content-Type", "application/xml");
    res.send(xml);
  });

  const httpServer = createServer(app);

  return httpServer;
}
