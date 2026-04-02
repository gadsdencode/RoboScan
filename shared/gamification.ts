export function calculateLevel(totalXp: number): number {
  return Math.floor(Math.sqrt(totalXp / 100)) + 1;
}

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
  }
} as const;

export type AchievementKey = keyof typeof ACHIEVEMENTS;
