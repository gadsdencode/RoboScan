// server/controllers/reportController.ts
// Handles optimization report generation routes

import { Router, Response } from "express";
import { storage } from "../storage.js";
import { generateOptimizationReport } from "../report-generator.js";
import { checkAuthentication } from "../auth.js";
import { isAdmin } from "../utils/admin.js";
import { checkFeatureAccess } from "../utils/accessControl.js";
import { FEATURES } from "../../shared/tiers.js";
import { verifyGuestReportAccessToken } from "../utils/reportAccessToken.js";

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

    const isAuth = checkAuthentication(req);
    const userId = isAuth ? req.user.claims.sub : undefined;

    // Admins always have access
    if (isAdmin(req)) {
      const report = generateOptimizationReport(scan);
      if (scan.score !== null && scan.score !== undefined) {
        report.percentileRank = await storage.getScorePercentile(scan.score);
      }
      const purchase = await storage.getPurchaseByScanId(scanId);
      return res.json({ scan, report, purchasedAt: purchase?.createdAt || null });
    }

    // Authenticated, user-owned scans: require owner + entitlement on server side.
    if (scan.userId) {
      if (!userId || scan.userId !== userId) {
        return res.status(403).json({
          message: "You can only access reports for your own scans",
        });
      }

      const access = await checkFeatureAccess(req, FEATURES.FULL_SCAN_DETAILS, { scanId });
      if (!access.hasAccess) {
        return res.status(403).json({
          message: "Payment required to access optimization report",
          requiresPayment: true,
        });
      }
    } else {
      // Anonymous scan purchases require a signed access token (prevents scanId-based IDOR).
      const token = typeof req.query.accessToken === "string" ? req.query.accessToken : "";
      const tokenClaims = token ? verifyGuestReportAccessToken(token, scanId) : null;
      if (!tokenClaims) {
        return res.status(403).json({
          message: "Payment required to access optimization report",
          requiresPayment: true,
        });
      }

      const purchaseForToken = await storage.getPurchaseByPaymentIntent(tokenClaims.paymentIntentId);
      if (!purchaseForToken || purchaseForToken.scanId !== scanId) {
        return res.status(403).json({
          message: "Payment required to access optimization report",
          requiresPayment: true,
        });
      }
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
