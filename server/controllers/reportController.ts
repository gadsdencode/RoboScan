// server/controllers/reportController.ts
// Handles optimization report generation routes

import { Router, Response } from "express";
import { storage } from "../storage.js";
import { generateOptimizationReport } from "../report-generator.js";
import { checkAuthentication } from "../auth.js";
import { isAdmin } from "../utils/admin.js";
import { checkFeatureAccess } from "../utils/accessControl.js";
import { FEATURES } from "../../shared/tiers.js";

const router = Router();

/**
 * GET /api/optimization-report/:scanId
 * Get optimization report for a scan (requires payment, authentication optional)
 */
router.get('/:scanId', async (req: any, res: Response) => {
  try {
    const scanId = parseInt(req.params.scanId);
    
    const scan = await storage.getScan(scanId);
    if (!scan) {
      return res.status(404).json({ message: "Scan not found" });
    }

    // For authenticated users with owned scans, verify ownership
    const isAuth = checkAuthentication(req);
    if (isAuth && scan.userId) {
      const userId = req.user.claims.sub;
      if (scan.userId !== userId) {
        return res.status(403).json({ 
          message: "You can only access reports for your own scans" 
        });
      }
    }

    // Admins always have access
    if (isAdmin(req)) {
      const report = generateOptimizationReport(scan);
      if (scan.score !== null && scan.score !== undefined) {
        report.percentileRank = await storage.getScorePercentile(scan.score);
      }
      const purchase = await storage.getPurchaseByScanId(scanId);
      return res.json({ scan, report, purchasedAt: purchase?.createdAt || null });
    }

    // Check feature access — grants entry for active subscribers OR per-scan purchasers
    const access = await checkFeatureAccess(req, FEATURES.FULL_SCAN_DETAILS, { scanId });

    if (!access.hasAccess) {
      return res.status(403).json({ 
        message: "Payment required to access optimization report",
        requiresPayment: true 
      });
    }

    const purchase = await storage.getPurchaseByScanId(scanId);

    const report = generateOptimizationReport(scan);
    
    // Fetch and inject percentile
    if (scan.score !== null && scan.score !== undefined) {
      const percentile = await storage.getScorePercentile(scan.score);
      report.percentileRank = percentile;
    }
    
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

export default router;
