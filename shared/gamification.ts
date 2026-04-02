export function calculateLevel(totalXp: number): number {
  return Math.floor(Math.sqrt(totalXp / 100)) + 1;
}

/**
 * Hours before the same domain can grant scan XP again for a user.
 * Limits farming by re-scanning one site; aligns with a “once per day” cadence.
 */
export const DOMAIN_COOLDOWN_HOURS = 24;

/** Rolling window (ms) for Speed Demon: 3 scans within this duration */
export const SPEED_DEMON_WINDOW_MS = 60_000;

/**
 * Conservative XP for non-scan actions (multiplied for Guardian subscribers in awardActionXP).
 */
export const XP_ACTION_AMOUNTS = {
  PREMIUM_FIELD_PURCHASE: 15,
  RECURRING_SCAN_CREATED: 10,
  BUILDER_VALIDATION: 5,
} as const;

export type BuilderValidationKey =
  | "llms"
  | "robots"
  | "sitemap"
  | "manifest"
  | "security"
  | "humans"
  | "ads"
  | "ai";

/**
 * XP multiplier for subscribers (Guardian tier)
 * Subscribers earn 2x XP on all actions
 */
export const SUBSCRIBER_XP_MULTIPLIER = 2.0;

/**
 * Get XP multiplier based on subscription status
 */
export function getXpMultiplier(isSubscriber: boolean): number {
  return isSubscriber ? SUBSCRIBER_XP_MULTIPLIER : 1.0;
}

/**
 * Calculate XP with multiplier applied
 */
export function calculateXpWithMultiplier(baseXp: number, isSubscriber: boolean): number {
  return Math.floor(baseXp * getXpMultiplier(isSubscriber));
}

export const ACHIEVEMENTS = {
  ARCHITECT: {
    key: 'ARCHITECT',
    name: 'AI Architect',
    description: 'Created a valid llms.txt file',
    xpReward: 50,
    icon: 'FileCode'
  },
  GUARDIAN: {
    key: 'GUARDIAN',
    name: 'Guardian',
    description: 'Ran 10 successful security scans',
    xpReward: 100,
    icon: 'Shield'
  },
  SPEED_DEMON: {
    key: 'SPEED_DEMON',
    name: 'Speed Demon',
    description: 'Scanned 3 sites in under 1 minute',
    xpReward: 30,
    icon: 'Zap'
  },
  FIRST_SCAN: {
    key: 'FIRST_SCAN',
    name: 'First Scan',
    description: 'Performed your first website scan',
    xpReward: 10,
    icon: 'Flag'
  },
  PERFECT_SCORE: {
    key: 'PERFECT_SCORE',
    name: 'Perfect Score',
    description: 'Achieved a scan score of 90 or above',
    xpReward: 75,
    icon: 'Award'
  },
  FULL_AUDIT: {
    key: 'FULL_AUDIT',
    name: 'Full Audit',
    description: 'Scanned a site with all 8 file types detected',
    xpReward: 100,
    icon: 'Layers'
  },
  SUBSCRIBER: {
    key: 'SUBSCRIBER',
    name: 'Guardian Subscriber',
    description: 'Upgraded to Guardian tier',
    xpReward: 25,
    icon: 'Crown'
  }
} as const;

export type AchievementKey = keyof typeof ACHIEVEMENTS;
