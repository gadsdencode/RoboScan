// server/utils/accessControl.ts
// Unified access control for the hybrid freemium model

import { storage } from "../storage.js";
import { isAdmin } from "./admin.js";
import { 
  FEATURES, 
  TIERS, 
  isSubscriptionOnlyFeature,
  XP_MULTIPLIERS,
  type FeatureName,
  type TierName 
} from "../../shared/tiers.js";

export interface AccessCheckResult {
  hasAccess: boolean;
  reason?: 'admin' | 'subscription' | 'purchase' | 'free';
  tier: TierName;
  isSubscriber: boolean;
  isPurchased?: boolean;
}

/**
 * Determine user's effective tier based on their purchases and subscription status
 */
export async function getUserTier(userId: string | undefined): Promise<TierName> {
  if (!userId) {
    return TIERS.SCOUT;
  }

  // Check for active subscription (Guardian tier)
  const subscription = await storage.getUserActiveSubscription(userId);
  if (subscription) {
    return TIERS.GUARDIAN;
  }

  // Check if user has any purchases (Architect tier)
  const [llmsFields, robotsFields] = await Promise.all([
    storage.getUserLlmsFieldPurchases(userId),
    storage.getUserRobotsFieldPurchases(userId),
  ]);

  if (llmsFields.length > 0 || robotsFields.length > 0) {
    return TIERS.ARCHITECT;
  }

  return TIERS.SCOUT;
}

/**
 * Check if user has access to a specific feature
 * This is the main access control function used throughout the app
 */
export async function checkFeatureAccess(
  req: any,
  feature: FeatureName,
  resourceId?: { scanId?: number; fieldKey?: string }
): Promise<AccessCheckResult> {
  // Admin bypass - always has full access
  if (isAdmin(req)) {
    return {
      hasAccess: true,
      reason: 'admin',
      tier: TIERS.GUARDIAN,
      isSubscriber: false, // Not technically a subscriber, but has access
    };
  }

  const userId = req.user?.claims?.sub;
  if (!userId) {
    return {
      hasAccess: false,
      tier: TIERS.SCOUT,
      isSubscriber: false,
    };
  }

  // Check subscription first (gives full access)
  const subscription = await storage.getUserActiveSubscription(userId);
  const isSubscriber = !!subscription;

  if (isSubscriber) {
    return {
      hasAccess: true,
      reason: 'subscription',
      tier: TIERS.GUARDIAN,
      isSubscriber: true,
    };
  }

  // Subscription-only features cannot be accessed without subscription
  if (isSubscriptionOnlyFeature(feature)) {
    return {
      hasAccess: false,
      tier: TIERS.SCOUT,
      isSubscriber: false,
    };
  }

  // Check one-time purchases for specific features
  let isPurchased = false;

  switch (feature) {
    case FEATURES.FULL_SCAN_DETAILS:
    case FEATURES.PDF_EXPORT:
      // Check if specific scan is purchased
      if (resourceId?.scanId) {
        const purchase = await storage.getPurchaseByScanId(resourceId.scanId);
        isPurchased = !!purchase;
      }
      break;

    case FEATURES.PREMIUM_LLMS_FIELDS:
      // Check if specific field is purchased
      if (resourceId?.fieldKey) {
        isPurchased = await storage.hasUserPurchasedField(userId, resourceId.fieldKey);
      } else {
        // Check if any LLMS field is purchased
        const llmsFields = await storage.getUserLlmsFieldPurchases(userId);
        isPurchased = llmsFields.length > 0;
      }
      break;

    case FEATURES.PREMIUM_ROBOTS_FIELDS:
      // Check if specific field is purchased
      if (resourceId?.fieldKey) {
        isPurchased = await storage.hasUserPurchasedRobotsField(userId, resourceId.fieldKey);
      } else {
        // Check if any robots field is purchased
        const robotsFields = await storage.getUserRobotsFieldPurchases(userId);
        isPurchased = robotsFields.length > 0;
      }
      break;
  }

  if (isPurchased) {
    return {
      hasAccess: true,
      reason: 'purchase',
      tier: TIERS.ARCHITECT,
      isSubscriber: false,
      isPurchased: true,
    };
  }

  return {
    hasAccess: false,
    tier: TIERS.SCOUT,
    isSubscriber: false,
    isPurchased: false,
  };
}

/**
 * Check if user has access to recurring scans feature
 * This is a subscription-only feature
 */
export async function checkRecurringScanAccess(req: any): Promise<AccessCheckResult> {
  return checkFeatureAccess(req, FEATURES.RECURRING_SCANS);
}

/**
 * Check if user has access to full scan details
 * Requires either subscription OR one-time report purchase
 */
export async function checkScanDetailsAccess(
  req: any,
  scanId: number
): Promise<AccessCheckResult> {
  return checkFeatureAccess(req, FEATURES.FULL_SCAN_DETAILS, { scanId });
}

/**
 * Check if user has access to a premium LLMS field
 * Requires either subscription OR field purchase
 */
export async function checkLlmsFieldAccess(
  req: any,
  fieldKey: string
): Promise<AccessCheckResult> {
  return checkFeatureAccess(req, FEATURES.PREMIUM_LLMS_FIELDS, { fieldKey });
}

/**
 * Check if user has access to a premium robots field
 * Requires either subscription OR field purchase
 */
export async function checkRobotsFieldAccess(
  req: any,
  fieldKey: string
): Promise<AccessCheckResult> {
  return checkFeatureAccess(req, FEATURES.PREMIUM_ROBOTS_FIELDS, { fieldKey });
}

/**
 * Get XP multiplier for user based on their tier
 */
export async function getXpMultiplier(userId: string | undefined): Promise<number> {
  if (!userId) {
    return XP_MULTIPLIERS[TIERS.SCOUT];
  }

  const tier = await getUserTier(userId);
  return XP_MULTIPLIERS[tier];
}

/**
 * Middleware to require subscription for a route
 */
export function requireSubscription(req: any, res: any, next: any) {
  checkRecurringScanAccess(req).then((result) => {
    if (result.hasAccess) {
      next();
    } else {
      res.status(403).json({
        message: "This feature requires an active subscription",
        requiresSubscription: true,
        tier: result.tier,
      });
    }
  }).catch((error) => {
    console.error('[AccessControl] Error checking subscription:', error);
    res.status(500).json({ message: "Failed to verify subscription status" });
  });
}

/**
 * Express middleware creator for feature-based access control
 */
export function requireFeature(feature: FeatureName, getResourceId?: (req: any) => { scanId?: number; fieldKey?: string } | undefined) {
  return (req: any, res: any, next: any) => {
    const resourceId = getResourceId?.(req);
    
    checkFeatureAccess(req, feature, resourceId).then((result) => {
      if (result.hasAccess) {
        // Attach access info to request for downstream use
        req.accessControl = result;
        next();
      } else {
        res.status(403).json({
          message: `This feature requires ${isSubscriptionOnlyFeature(feature) ? 'an active subscription' : 'a purchase or subscription'}`,
          requiresSubscription: isSubscriptionOnlyFeature(feature),
          requiresPurchase: !isSubscriptionOnlyFeature(feature),
          tier: result.tier,
          feature,
        });
      }
    }).catch((error) => {
      console.error('[AccessControl] Error checking feature access:', error);
      res.status(500).json({ message: "Failed to verify access" });
    });
  };
}

