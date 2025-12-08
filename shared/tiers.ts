// shared/tiers.ts
// Tier configuration and access control constants for the hybrid freemium model

/**
 * Tier Definitions:
 * - SCOUT (Free): Discovery & Awareness - Limited scan details
 * - ARCHITECT (One-Time): Detailed Audit & Fixes - Unlocked per-scan/per-field
 * - GUARDIAN (Subscription): Automation & Monitoring - Full access + recurring scans
 */

export const TIERS = {
  SCOUT: 'scout',       // Free tier
  ARCHITECT: 'architect', // One-time purchases
  GUARDIAN: 'guardian',   // Subscription tier
} as const;

export type TierName = typeof TIERS[keyof typeof TIERS];

/**
 * Feature flags that can be checked for access control
 */
export const FEATURES = {
  // Scan Features
  FULL_SCAN_DETAILS: 'full_scan_details',      // See all errors, warnings, recommendations
  SCAN_HISTORY_UNLIMITED: 'scan_history_unlimited', // More than 1 scan in history
  SCAN_COMPARISON: 'scan_comparison',           // Diff view vs previous scans
  PDF_EXPORT: 'pdf_export',                     // Download PDF reports
  
  // Recurring Scan Features (Guardian only)
  RECURRING_SCANS: 'recurring_scans',           // Set up daily/weekly/monthly scans
  CHANGE_ALERTS: 'change_alerts',               // Get notified on changes
  
  // Builder Features
  PREMIUM_LLMS_FIELDS: 'premium_llms_fields',   // Access to premium LLMs.txt fields
  PREMIUM_ROBOTS_FIELDS: 'premium_robots_fields', // Access to premium robots.txt fields
  
  // Gamification
  XP_MULTIPLIER: 'xp_multiplier',               // 2x XP for subscribers
} as const;

export type FeatureName = typeof FEATURES[keyof typeof FEATURES];

/**
 * Feature access by tier
 * Note: 'purchase' means the feature requires either a one-time purchase OR subscription
 */
export const TIER_FEATURES: Record<TierName, FeatureName[]> = {
  // Free tier: Basic scanning only
  [TIERS.SCOUT]: [],
  
  // One-time purchases: Unlocks specific items
  [TIERS.ARCHITECT]: [
    FEATURES.FULL_SCAN_DETAILS,
    FEATURES.PDF_EXPORT,
    FEATURES.PREMIUM_LLMS_FIELDS,
    FEATURES.PREMIUM_ROBOTS_FIELDS,
  ],
  
  // Subscription: Everything + automation
  [TIERS.GUARDIAN]: [
    FEATURES.FULL_SCAN_DETAILS,
    FEATURES.SCAN_HISTORY_UNLIMITED,
    FEATURES.SCAN_COMPARISON,
    FEATURES.PDF_EXPORT,
    FEATURES.RECURRING_SCANS,
    FEATURES.CHANGE_ALERTS,
    FEATURES.PREMIUM_LLMS_FIELDS,
    FEATURES.PREMIUM_ROBOTS_FIELDS,
    FEATURES.XP_MULTIPLIER,
  ],
};

/**
 * Subscription-only features (cannot be unlocked with one-time purchase)
 */
export const SUBSCRIPTION_ONLY_FEATURES: FeatureName[] = [
  FEATURES.RECURRING_SCANS,
  FEATURES.CHANGE_ALERTS,
  FEATURES.SCAN_HISTORY_UNLIMITED,
  FEATURES.SCAN_COMPARISON,
  FEATURES.XP_MULTIPLIER,
];

/**
 * Pricing configuration
 */
export const PRICING = {
  // One-time purchases
  REPORT_UNLOCK: 9.99,        // Unlock full details for a single scan
  
  // Subscription (Guardian tier)
  GUARDIAN_MONTHLY: 29.00,    // Monthly subscription price
  GUARDIAN_YEARLY: 290.00,    // Yearly subscription price (2 months free)
} as const;

/**
 * XP Multipliers by tier
 */
export const XP_MULTIPLIERS: Record<TierName, number> = {
  [TIERS.SCOUT]: 1.0,
  [TIERS.ARCHITECT]: 1.0,
  [TIERS.GUARDIAN]: 2.0,  // 2x XP for subscribers
};

/**
 * Free tier scan history limit
 */
export const FREE_SCAN_HISTORY_LIMIT = 1;

/**
 * Check if a feature is subscription-only
 */
export function isSubscriptionOnlyFeature(feature: FeatureName): boolean {
  return SUBSCRIPTION_ONLY_FEATURES.includes(feature);
}

/**
 * Check if a tier has access to a specific feature
 */
export function tierHasFeature(tier: TierName, feature: FeatureName): boolean {
  return TIER_FEATURES[tier].includes(feature);
}

