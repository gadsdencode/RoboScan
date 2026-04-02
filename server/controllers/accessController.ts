// server/controllers/accessController.ts
// Aggregated access-control data for authenticated users (single round-trip)

import { Router, Response } from "express";
import { storage } from "../storage.js";
import { isAuthenticated } from "../auth.js";
import { isAdmin } from "../utils/admin.js";

const router = Router();

function serializeDate(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return null;
}

/**
 * GET /api/user/access-summary
 * Returns subscription status, purchases, and tier in one response.
 * Composes existing storage reads (same queries as the individual purchase endpoints, but one subscription lookup).
 */
router.get("/access-summary", isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.user.claims.sub;

    const [llmsPurchases, robotsPurchases, hasScanPurchase, subscription] = await Promise.all([
      storage.getUserLlmsFieldPurchases(userId),
      storage.getUserRobotsFieldPurchases(userId),
      storage.getUserHasScanPurchase(userId),
      storage.getUserActiveSubscription(userId),
    ]);

    const admin = isAdmin(req);
    const hasSubscription = !!subscription;

    const plan = subscription
      ? await storage.getSubscriptionPlanByPriceId(subscription.stripePriceId)
      : undefined;

    const llmsFieldPurchases = llmsPurchases.map((p) => p.fieldKey);
    const robotsFieldPurchases = robotsPurchases.map((p) => p.fieldKey);

    const hasAnyPurchase =
      admin || llmsFieldPurchases.length > 0 || robotsFieldPurchases.length > 0 || hasScanPurchase;

    const isSubscriberEffective = admin || hasSubscription;
    const tier = isSubscriberEffective ? "guardian" : hasAnyPurchase ? "architect" : "scout";

    res.json({
      tier,
      // Subscription only (excludes admin); clients combine with their own admin flag if needed
      isSubscriber: hasSubscription,
      isAdmin: admin,
      hasAnyPurchase,
      llmsFieldPurchases,
      robotsFieldPurchases,
      hasScanPurchase,
      subscription: subscription
        ? {
            status: subscription.status,
            planName: plan?.name ?? null,
            currentPeriodEnd: serializeDate(subscription.currentPeriodEnd),
          }
        : null,
    });
  } catch (error) {
    console.error("Get access summary error:", error);
    res.status(500).json({ message: "Failed to fetch access summary" });
  }
});

export default router;
