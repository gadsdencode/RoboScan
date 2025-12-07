// server/controllers/scanController.ts
// Handles website scanning and scan management routes

import { Router, Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage.js";
import { scanWebsite } from "../scanner.js";
import { calculateScanScore } from "../report-generator.js";
import { isAuthenticated, checkAuthentication } from "../auth.js";
import { calculateLevel } from "../gamification.js";
import { normalizeDomainForCooldown } from "../domain-utils.js";
import { isAdmin } from "../utils/admin.js";
import {
  scanRequestSchema,
  tagsSchema,
  parsePositiveInt,
  parseNonNegativeInt,
} from "../utils/validation.js";

const router = Router();

/**
 * GET /api/user/scans
 * Get authenticated user's scans with optional tag filtering and pagination
 */
router.get('/scans', isAuthenticated, async (req: any, res: Response) => {
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

/**
 * POST /api/scan
 * Perform a website scan (works for both authenticated and anonymous users)
 */
router.post('/', async (req: any, res: Response) => {
  try {
    const { url } = scanRequestSchema.parse(req.body);

    // Safely check authentication without requiring middleware
    const isAuth = checkAuthentication(req);
    const userId = isAuth ? req.user?.claims?.sub : undefined;

    const canonicalDomain = normalizeDomainForCooldown(url);
    if (!canonicalDomain) {
      return res.status(400).json({
        message: "Invalid URL format",
        error: "Could not parse domain from URL"
      });
    }

    let isOnCooldown = false;
    if (userId) {
      isOnCooldown = await storage.checkDomainCooldown(userId, canonicalDomain);
    }

    let result;
    try {
      result = await scanWebsite(url);
    } catch (scanError) {
      // If scanWebsite throws a critical error (DNS, timeout, etc.), return it immediately
      console.error('[ScanController] Critical scan error:', scanError);
      const errorMessage = scanError instanceof Error ? scanError.message : 'Failed to scan website';
      return res.status(500).json({ 
        message: errorMessage,
        error: errorMessage
      });
    }

    // Calculate score immediately
    const tempScanObj = { 
      ...result, 
      url,
      id: 0,
      userId,
      createdAt: new Date(),
      tags: [],
      score: 0
    };
    const score = calculateScanScore(tempScanObj as any);

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
      score,
    });

    let gamificationUpdates = null;
    
    if (userId) {
      const currentUser = await storage.getUser(userId);
      
      if (currentUser) {
        if (!isOnCooldown) {
          let xpGain = 10;

          if (result.robotsTxtFound && result.llmsTxtFound) {
            xpGain += 40; 
          }

          const currentXp = currentUser.xp || 0;
          const newXp = currentXp + xpGain;
          const newLevel = calculateLevel(newXp);
          const oldLevel = currentUser.level || 1;

          await storage.updateUserGamificationStats(userId, newXp, newLevel);

          await storage.upsertDomainCooldown(userId, canonicalDomain);

          gamificationUpdates = {
            xpGained: xpGain,
            totalXp: newXp,
            newLevel: newLevel,
            levelUp: newLevel > oldLevel
          };
        } else {
          gamificationUpdates = {
            xpGained: 0,
            totalXp: currentUser.xp || 0,
            newLevel: currentUser.level || 1,
            levelUp: false,
            cooldownActive: true
          };
        }
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
    
    console.error('[ScanController] Scan endpoint error:', error);
    
    // Provide more specific error messages
    let errorMessage = "Failed to scan website";
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Enhance common error messages
      if (error.message.includes('DNS')) {
        errorMessage = "DNS resolution failed: Unable to resolve the domain name. Please check if the website URL is correct.";
      } else if (error.message.includes('timeout')) {
        errorMessage = "Connection timeout: The website did not respond within the time limit. The server may be down or unreachable.";
      } else if (error.message.includes('refused') || error.message.includes('ECONNREFUSED')) {
        errorMessage = "Connection refused: The website server is not accepting connections. The server may be down or blocking requests.";
      } else if (error.message.includes('certificate') || error.message.includes('SSL') || error.message.includes('TLS')) {
        errorMessage = "SSL/TLS certificate error: Unable to establish a secure connection. The website's certificate may be invalid or expired.";
      }
    }
    
    res.status(500).json({ 
      message: errorMessage,
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * GET /api/scans/:id
 * Get individual scan by ID with ownership check
 */
router.get('/:id', isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.user.claims.sub;
    const scanId = parseInt(req.params.id);
    
    if (isNaN(scanId)) {
      return res.status(400).json({ message: "Invalid scan ID" });
    }

    const scan = await storage.getScanById(scanId, userId);
    
    if (!scan) {
      return res.status(404).json({ message: "Scan not found" });
    }

    // Check if purchased
    const purchase = await storage.getPurchaseByScanId(scanId);
    const scanWithPurchase = {
      ...scan,
      isPurchased: !!purchase || isAdmin(req)
    };

    res.json(scanWithPurchase);
  } catch (error) {
    console.error('Get scan by ID error:', error);
    res.status(500).json({ message: "Failed to get scan" });
  }
});

/**
 * PATCH /api/scans/:id/tags
 * Update tags for a scan (requires authentication)
 */
router.patch('/:id/tags', isAuthenticated, async (req: any, res: Response) => {
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

    const { tags } = tagsSchema.parse(req.body);

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

export default router;
