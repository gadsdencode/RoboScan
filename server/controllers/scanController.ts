// server/controllers/scanController.ts
// Handles website scanning and scan management routes
// NOTE: Free tier sees limited details; subscription/purchase unlocks full details
// 
// ASYNC SCANNING ARCHITECTURE:
// - POST /api/scan now supports async mode via ?async=true query param
// - Async mode creates a job and returns 202 Accepted with jobId immediately
// - Background worker (QStash) performs actual scan
// - Frontend polls GET /api/scan-jobs/:jobId/status for completion
// - Sync mode (default) maintains backward compatibility

import { Router, Response } from "express";
import { z } from "zod";
import { storage } from "../storage.js";
import { isAuthenticated, checkAuthentication } from "../auth.js";
import { isAdmin } from "../utils/admin.js";
import {
  scanRequestSchema,
  tagsSchema,
  parsePositiveInt,
  parseNonNegativeInt,
} from "../utils/validation.js";

// Import services
import {
  performSyncScan,
  initializeAsyncScan,
  validateScanUrl,
  shouldUseAsyncMode,
  formatScanError,
} from "../services/scanService.js";
import {
  awardScanXP,
  evaluateScanAchievementsAfterScan,
} from "../services/gamificationService.js";
import { createScanShareToken } from "../utils/shareToken.js";

const router = Router();

/**
 * Helper to determine access level for scan details
 */
async function getScanAccessLevel(
  req: any,
  scanId: number,
  userId: string | undefined
): Promise<{ isPurchased: boolean; isSubscriber: boolean; hasFullAccess: boolean }> {
  // Admin always has full access
  if (isAdmin(req)) {
    return { isPurchased: true, isSubscriber: true, hasFullAccess: true };
  }

  if (!userId) {
    return { isPurchased: false, isSubscriber: false, hasFullAccess: false };
  }

  const [purchase, subscription] = await Promise.all([
    storage.getPurchaseByScanId(scanId),
    storage.getUserActiveSubscription(userId),
  ]);

  const isPurchased = !!purchase;
  const isSubscriber = !!subscription;
  const hasFullAccess = isPurchased || isSubscriber;

  return { isPurchased, isSubscriber, hasFullAccess };
}

/**
 * GET /api/user/scan-purchases
 * Returns whether the authenticated user has made any scan-report purchases.
 * Used by useAccessControl to populate hasAnyPurchase for tier calculation.
 */
router.get('/scan-purchases', isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.user.claims.sub;
    const hasPurchase = await storage.getUserHasScanPurchase(userId);
    res.json({ hasPurchase });
  } catch (error) {
    console.error('Get scan purchases error:', error);
    res.status(500).json({ message: 'Failed to fetch scan purchases' });
  }
});

/**
 * GET /api/user/scans
 * Get authenticated user's scans with optional tag filtering and pagination
 * Includes access level info (subscription/purchase status)
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
    
    // Check if user has active subscription (applies to all scans)
    const subscription = await storage.getUserActiveSubscription(userId);
    const isSubscriber = !!subscription || isAdmin(req);
    
    // Add access status to each scan
    const scansWithAccessStatus = await Promise.all(
      scans.map(async (scan) => {
        const purchase = await storage.getPurchaseByScanId(scan.id);
        const isPurchased = !!purchase;
        const hasFullAccess = isPurchased || isSubscriber;
        
        return {
          ...scan,
          isPurchased,
          isSubscriber,
          hasFullAccess, // Can see full details (errors, warnings, content)
          shareToken: createScanShareToken(scan.id),
        };
      })
    );
    
    res.json({
      scans: scansWithAccessStatus,
      meta: {
        isSubscriber,
        limit,
        offset,
      }
    });
  } catch (error) {
    console.error("Error fetching user scans:", error);
    res.status(500).json({ message: "Failed to fetch scans" });
  }
});

/**
 * POST /api/scan
 * Perform a website scan (works for both authenticated and anonymous users)
 * 
 * Query params:
 * - async=true: Use async mode (returns 202 with jobId, frontend polls for result)
 * - async=false (default): Use sync mode (blocks until scan complete, backward compatible)
 * 
 * Async mode is recommended for Vercel deployments to avoid serverless timeouts
 */
router.post('/', async (req: any, res: Response) => {
  try {
    const { url, tags } = scanRequestSchema.parse(req.body);

    // Safely check authentication without requiring middleware
    const isAuth = checkAuthentication(req);
    const userId = isAuth ? req.user?.claims?.sub : undefined;

    // Validate URL format
    const canonicalDomain = validateScanUrl(url);
    if (!canonicalDomain) {
      return res.status(400).json({
        message: "Invalid URL format",
        error: "Could not parse domain from URL"
      });
    }

    // Determine scan mode (async vs sync)
    if (shouldUseAsyncMode(req.query.async)) {
      // ASYNC MODE: Create job and return immediately
      try {
        const asyncResult = await initializeAsyncScan(url, userId, tags || []);
        return res.status(202).json(asyncResult);
      } catch (asyncError) {
        console.error('[ScanController] Async scan error:', asyncError);
        return res.status(500).json({
          message: 'Failed to initiate async scan',
          error: asyncError instanceof Error ? asyncError.message : 'Unknown error',
        });
      }
    }

    // SYNC MODE: Perform scan and return results
    const scanResult = await performSyncScan(url, userId, tags || []);

    // Award XP for authenticated users
    let gamificationUpdates = null;
    if (userId) {
      gamificationUpdates = await awardScanXP(
        userId,
        scanResult.scanData,
        scanResult.canonicalDomain
      );
      const achievementsUnlocked = await evaluateScanAchievementsAfterScan(
        userId,
        scanResult.scan
      );
      if (gamificationUpdates && achievementsUnlocked.length > 0) {
        gamificationUpdates.achievementsUnlocked = achievementsUnlocked;
      }
    }

    // Return scan results
    const { scan } = scanResult;
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
      score: scan.score,
      shareToken: createScanShareToken(scan.id),
      gamification: gamificationUpdates,
    });
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Invalid request", 
        errors: error.errors 
      });
    }
    
    console.error('[ScanController] Scan endpoint error:', error);
    
    // Format user-friendly error message
    const errorMessage = formatScanError(error);
    
    res.status(500).json({ 
      message: errorMessage,
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * GET /api/scan-jobs/:jobId/status
 * Poll endpoint for async scan job status
 * Returns job status, progress, and result when completed
 */
router.get('/:jobId/status', async (req: any, res: Response) => {
  try {
    const { jobId } = req.params;

    if (!jobId) {
      return res.status(400).json({ message: 'Missing jobId parameter' });
    }

    const job = await storage.getScanJob(jobId);

    if (!job) {
      return res.status(404).json({ message: 'Scan job not found' });
    }

    // Check if user has access to this job
    const isAuth = checkAuthentication(req);
    const userId = isAuth ? req.user?.claims?.sub : undefined;

    // For non-authenticated requests, only allow access to anonymous jobs
    // For authenticated requests, only allow access to their own jobs or anonymous jobs
    if (job.userId && job.userId !== userId) {
      return res.status(403).json({ message: 'Access denied to this scan job' });
    }

    // Build response based on job status
    const response: any = {
      jobId: job.id,
      status: job.status,
      url: job.url,
      progress: job.progress,
      progressMessage: job.progressMessage,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
    };

    // If completed, include scan data
    if (job.status === 'completed' && job.scanId) {
      const scan = await storage.getScan(job.scanId);
      if (scan) {
        response.scanId = scan.id;
        response.result = {
          id: scan.id,
          url: scan.url,
          robotsTxtFound: scan.robotsTxtFound,
          robotsTxtContent: scan.robotsTxtContent,
          llmsTxtFound: scan.llmsTxtFound,
          llmsTxtContent: scan.llmsTxtContent,
          sitemapXmlFound: scan.sitemapXmlFound,
          securityTxtFound: scan.securityTxtFound,
          manifestJsonFound: scan.manifestJsonFound,
          adsTxtFound: scan.adsTxtFound,
          humansTxtFound: scan.humansTxtFound,
          aiTxtFound: scan.aiTxtFound,
          botPermissions: scan.botPermissions,
          errors: scan.errors,
          warnings: scan.warnings,
          score: scan.score,
          shareToken: createScanShareToken(scan.id),
        };

        if (userId) {
          const payload = await storage.getScanGamificationNotification(
            userId,
            scan.id
          );
          if (
            payload &&
            (payload.gamification ||
              (payload.achievementsUnlocked &&
                payload.achievementsUnlocked.length > 0))
          ) {
            response.gamification = {
              xpGained: payload.gamification?.xpGained ?? 0,
              baseXp: payload.gamification?.baseXp,
              multiplier: payload.gamification?.multiplier,
              totalXp: payload.gamification?.totalXp ?? 0,
              newLevel: payload.gamification?.newLevel ?? 1,
              levelUp: payload.gamification?.levelUp ?? false,
              cooldownActive: payload.gamification?.cooldownActive,
              isSubscriber: payload.gamification?.isSubscriber,
              achievementsUnlocked: payload.achievementsUnlocked ?? [],
            };
          }
        }
      }
    }

    // If failed, include error message
    if (job.status === 'failed') {
      response.error = job.error;
    }

    res.json(response);
  } catch (error) {
    console.error('[ScanController] Get job status error:', error);
    res.status(500).json({ message: 'Failed to get scan job status' });
  }
});

/**
 * GET /api/scans/:id
 * Get individual scan by ID with ownership check
 * Returns access level info for proper UI rendering
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

    // Get comprehensive access level
    const accessLevel = await getScanAccessLevel(req, scanId, userId);

    const scanWithAccess = {
      ...scan,
      isPurchased: accessLevel.isPurchased,
      isSubscriber: accessLevel.isSubscriber,
      hasFullAccess: accessLevel.hasFullAccess,
      shareToken: createScanShareToken(scanId),
    };

    res.json(scanWithAccess);
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

    let tags: string[];
    try {
      ({ tags } = tagsSchema.parse(req.body));
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        return res.status(400).json({
          message: "Invalid tags format",
          errors: validationError.errors,
        });
      }
      throw validationError;
    }

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
