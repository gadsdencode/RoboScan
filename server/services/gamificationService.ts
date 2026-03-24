// server/services/gamificationService.ts
// Gamification service - handles XP awards, level calculations, and cooldowns

import { storage } from "../storage.js";
import { calculateLevel, calculateXpWithMultiplier } from "../gamification.js";

/**
 * XP configuration constants
 */
const XP_CONFIG = {
  BASE_SCAN_XP: 10,
  BONUS_BOTH_FILES_XP: 40, // Bonus for finding both robots.txt and llms.txt
} as const;

/**
 * Result of XP award calculation
 */
export interface GamificationUpdate {
  xpGained: number;
  baseXp?: number;
  multiplier?: number;
  totalXp: number;
  newLevel: number;
  levelUp: boolean;
  cooldownActive?: boolean;
  isSubscriber: boolean;
}

/**
 * Scan result data needed for XP calculation
 */
export interface ScanResultForXP {
  robotsTxtFound: boolean;
  llmsTxtFound: boolean;
}

/**
 * Checks if a user is on cooldown for a specific domain.
 * 
 * @param userId - The user ID to check
 * @param canonicalDomain - The normalized domain to check
 * @returns true if user is on cooldown for this domain
 */
export async function checkCooldown(
  userId: string,
  canonicalDomain: string
): Promise<boolean> {
  return storage.checkDomainCooldown(userId, canonicalDomain);
}

/**
 * Updates the cooldown timestamp for a user/domain pair.
 * 
 * @param userId - The user ID to update
 * @param canonicalDomain - The normalized domain
 */
export async function updateCooldown(
  userId: string,
  canonicalDomain: string
): Promise<void> {
  await storage.upsertDomainCooldown(userId, canonicalDomain);
}

/**
 * Calculates and awards XP for a completed scan.
 * 
 * XP Calculation:
 * - Base: 10 XP per scan
 * - Bonus: +40 XP if both robots.txt and llms.txt are found
 * - Multiplier: 2x for subscribers (Guardian tier)
 * 
 * Does not award XP if:
 * - User is on cooldown for this domain
 * - User does not exist
 * 
 * @param userId - The user ID to award XP to
 * @param scanResult - Scan data needed for XP calculation
 * @param canonicalDomain - The normalized domain (for cooldown tracking)
 * @param isOnCooldown - Whether the user is on cooldown for this domain
 * @returns Gamification update object with XP changes
 */
export async function awardScanXP(
  userId: string,
  scanResult: ScanResultForXP,
  canonicalDomain: string,
  isOnCooldown: boolean
): Promise<GamificationUpdate | null> {
  // Fetch user and subscription status
  const [currentUser, subscription] = await Promise.all([
    storage.getUser(userId),
    storage.getUserActiveSubscription(userId),
  ]);

  if (!currentUser) {
    console.warn(`[GamificationService] User ${userId} not found, skipping XP award`);
    return null;
  }

  const isSubscriber = !!subscription;

  // If on cooldown, return current stats without awarding XP
  if (isOnCooldown) {
    return {
      xpGained: 0,
      totalXp: currentUser.xp || 0,
      newLevel: currentUser.level || 1,
      levelUp: false,
      cooldownActive: true,
      isSubscriber,
    };
  }

  // Calculate XP to award
  let baseXpGain = XP_CONFIG.BASE_SCAN_XP;

  // Bonus XP for finding both key files
  if (scanResult.robotsTxtFound && scanResult.llmsTxtFound) {
    baseXpGain += XP_CONFIG.BONUS_BOTH_FILES_XP;
  }

  // Apply subscriber multiplier (Guardian tier = 2x)
  const xpGain = calculateXpWithMultiplier(baseXpGain, isSubscriber);

  // Calculate new totals
  const currentXp = currentUser.xp || 0;
  const newXp = currentXp + xpGain;
  const newLevel = calculateLevel(newXp);
  const oldLevel = currentUser.level || 1;

  // Update user stats in database
  await storage.updateUserGamificationStats(userId, newXp, newLevel);

  // Update cooldown
  await storage.upsertDomainCooldown(userId, canonicalDomain);

  return {
    xpGained: xpGain,
    baseXp: baseXpGain,
    multiplier: isSubscriber ? 2 : 1,
    totalXp: newXp,
    newLevel: newLevel,
    levelUp: newLevel > oldLevel,
    isSubscriber,
  };
}

/**
 * Gets the current XP and level for a user.
 * 
 * @param userId - The user ID to check
 * @returns Current XP and level, or null if user not found
 */
export async function getUserGamificationStats(
  userId: string
): Promise<{ xp: number; level: number } | null> {
  const user = await storage.getUser(userId);
  
  if (!user) {
    return null;
  }

  return {
    xp: user.xp || 0,
    level: user.level || 1,
  };
}

/**
 * Checks if a user has an active subscription (Guardian tier).
 * 
 * @param userId - The user ID to check
 * @returns true if user has active subscription
 */
export async function isUserSubscriber(userId: string): Promise<boolean> {
  const subscription = await storage.getUserActiveSubscription(userId);
  return !!subscription;
}
