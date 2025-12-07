// server/controllers/reportController.ts
// Handles optimization report generation routes

import { Router, Response } from "express";
import { storage } from "../storage.js";
import { generateOptimizationReport } from "../report-generator.js";
import { checkAuthentication } from "../auth.js";
import { isAdmin } from "../utils/admin.js";

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

    const purchase = await storage.getPurchaseByScanId(scanId);
    
    // GOD MODE: Allow access if purchase exists OR if user is admin
    if (!purchase && !isAdmin(req)) {
      return res.status(403).json({ 
        message: "Payment required to access optimization report",
        requiresPayment: true 
      });
    }

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
