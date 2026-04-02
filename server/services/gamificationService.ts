// server/services/gamificationService.ts
// Gamification service - handles XP awards, level calculations, and cooldowns

import { storage } from "../storage.js";
import {
  ACHIEVEMENTS,
  calculateLevel,
  calculateXpWithMultiplier,
  SPEED_DEMON_WINDOW_MS,
  XP_ACTION_AMOUNTS,
} from "../gamification.js";
import type { Scan, Achievement } from "../../shared/schema.js";

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
  achievementsUnlocked?: AchievementUnlockSummary[];
}

/**
 * Achievement unlocked in a single scan flow (for API + toasts)
 */
export interface AchievementUnlockSummary {
  key: string;
  name: string;
  xpReward: number;
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
  const [currentUser, subscription] = await Promise.all([
    storage.getUser(userId),
    storage.getUserActiveSubscription(userId),
  ]);

  if (!currentUser) {
    console.warn(`[GamificationService] User ${userId} not found, skipping XP award`);
    return null;
  }

  const isSubscriber = !!subscription;

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

  let baseXpGain = XP_CONFIG.BASE_SCAN_XP;

  if (scanResult.robotsTxtFound && scanResult.llmsTxtFound) {
    baseXpGain += XP_CONFIG.BONUS_BOTH_FILES_XP;
  }

  const xpGain = calculateXpWithMultiplier(baseXpGain, isSubscriber);

  const currentXp = currentUser.xp || 0;
  const newXp = currentXp + xpGain;
  const newLevel = calculateLevel(newXp);
  const oldLevel = currentUser.level || 1;

  await storage.updateUserGamificationStats(userId, newXp, newLevel);

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
 * Awards XP for product actions (purchases, recurring scans, validations).
 * Applies Guardian subscriber multiplier the same way as scan XP.
 *
 * @param userId - User to credit
 * @param action - Logical action name (for logs / future analytics)
 * @param baseXp - Pre-multiplier amount from {@link XP_ACTION_AMOUNTS}
 */
export async function awardActionXP(
  userId: string,
  action: string,
  baseXp: number
): Promise<GamificationUpdate | null> {
  if (baseXp <= 0) {
    return null;
  }

  const [currentUser, subscription] = await Promise.all([
    storage.getUser(userId),
    storage.getUserActiveSubscription(userId),
  ]);

  if (!currentUser) {
    console.warn(`[GamificationService] awardActionXP(${action}): user ${userId} not found`);
    return null;
  }

  const isSubscriber = !!subscription;
  const xpGain = calculateXpWithMultiplier(baseXp, isSubscriber);
  const currentXp = currentUser.xp || 0;
  const newXp = currentXp + xpGain;
  const newLevel = calculateLevel(newXp);
  const oldLevel = currentUser.level || 1;

  await storage.updateUserGamificationStats(userId, newXp, newLevel);

  return {
    xpGained: xpGain,
    baseXp,
    multiplier: isSubscriber ? 2 : 1,
    totalXp: newXp,
    newLevel,
    levelUp: newLevel > oldLevel,
    isSubscriber,
  };
}

/**
 * Adds a flat XP amount to the user and recalculates level (no subscriber multiplier).
 * Used for achievement rewards and passive recurring-scan XP.
 *
 * @param userId - User to credit
 * @param amount - Raw XP to add (must be positive)
 * @returns Gamification snapshot after applying XP, or null if user missing or amount invalid
 */
export async function applyFlatXp(
  userId: string,
  amount: number
): Promise<GamificationUpdate | null> {
  if (amount <= 0) {
    return null;
  }

  const [user, subscription] = await Promise.all([
    storage.getUser(userId),
    storage.getUserActiveSubscription(userId),
  ]);

  if (!user) {
    console.warn(`[GamificationService] applyFlatXp: user ${userId} not found`);
    return null;
  }

  const isSubscriber = !!subscription;
  const currentXp = user.xp || 0;
  const newXp = currentXp + amount;
  const newLevel = calculateLevel(newXp);
  const oldLevel = user.level || 1;

  await storage.updateUserGamificationStats(userId, newXp, newLevel);

  return {
    xpGained: amount,
    totalXp: newXp,
    newLevel,
    levelUp: newLevel > oldLevel,
    isSubscriber,
  };
}

/**
 * Awards passive XP from Guardian recurring scans (flat amount; no subscriber multiplier).
 *
 * @param userId - User to credit
 * @param passiveAmount - XP amount (e.g. 5)
 */
export async function awardPassiveXP(
  userId: string,
  passiveAmount: number
): Promise<GamificationUpdate | null> {
  return applyFlatXp(userId, passiveAmount);
}

function isFullAuditScan(scan: Scan): boolean {
  return (
    scan.robotsTxtFound &&
    scan.llmsTxtFound &&
    (scan.sitemapXmlFound ?? false) &&
    (scan.securityTxtFound ?? false) &&
    (scan.manifestJsonFound ?? false) &&
    (scan.adsTxtFound ?? false) &&
    (scan.humansTxtFound ?? false) &&
    (scan.aiTxtFound ?? false)
  );
}

function appendUnlock(
  result: { unlocked: boolean; achievement?: Achievement },
  unlocked: AchievementUnlockSummary[]
): void {
  if (result.unlocked && result.achievement) {
    unlocked.push({
      key: result.achievement.key,
      name: result.achievement.name,
      xpReward: result.achievement.xpReward,
    });
  }
}

/**
 * Evaluates and unlocks scan-related achievements after a scan row is persisted.
 * Idempotent per achievement via storage.unlockAchievement.
 *
 * @param userId - Scan owner
 * @param scan - Persisted scan row (includes score and file flags)
 */
export async function evaluateScanAchievementsAfterScan(
  userId: string,
  scan: Scan
): Promise<AchievementUnlockSummary[]> {
  const unlocked: AchievementUnlockSummary[] = [];

  const totalScans = await storage.countUserScans(userId);
  if (totalScans === 1) {
    appendUnlock(
      await storage.unlockAchievement(userId, ACHIEVEMENTS.FIRST_SCAN.key),
      unlocked
    );
  }

  if ((scan.score ?? 0) >= 90) {
    appendUnlock(
      await storage.unlockAchievement(userId, ACHIEVEMENTS.PERFECT_SCORE.key),
      unlocked
    );
  }

  if (isFullAuditScan(scan)) {
    appendUnlock(
      await storage.unlockAchievement(userId, ACHIEVEMENTS.FULL_AUDIT.key),
      unlocked
    );
  }

  if (totalScans >= 10) {
    appendUnlock(
      await storage.unlockAchievement(userId, ACHIEVEMENTS.GUARDIAN.key),
      unlocked
    );
  }

  const since = new Date(Date.now() - SPEED_DEMON_WINDOW_MS);
  const recentCount = await storage.countUserScansSince(userId, since);
  if (recentCount >= 3) {
    appendUnlock(
      await storage.unlockAchievement(userId, ACHIEVEMENTS.SPEED_DEMON.key),
      unlocked
    );
  }

  return unlocked;
}

/**
 * Persists scan gamification payload for async clients that poll job status (no schema change).
 * Stored on a read notification row keyed by scanId.
 */
export async function recordScanGamificationNotification(
  userId: string,
  scanId: number,
  gamification: GamificationUpdate | null,
  achievementsUnlocked: AchievementUnlockSummary[]
): Promise<void> {
  if (!gamification && achievementsUnlocked.length === 0) {
    return;
  }

  await storage.createNotification({
    userId,
    scanId,
    type: "scan_gamification",
    title: "Scan complete",
    message: "Your scan rewards are ready.",
    changes: {
      gamification: gamification ?? undefined,
      achievementsUnlocked:
        achievementsUnlocked.length > 0 ? achievementsUnlocked : undefined,
    } as Record<string, any>,
    isRead: true,
  });
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

/** Progress hint for TrophyCase (locked achievements) */
export interface AchievementProgressEntry {
  current: number;
  target: number;
  hint: string;
}

/**
 * Batched scan-derived metrics for achievement progress hints (single round-trip per metric group).
 */
export async function getAchievementProgressForUser(
  userId: string
): Promise<Record<string, AchievementProgressEntry>> {
  const [totalScans, recentCount, maxScore, maxCoverage, subscription] = await Promise.all([
    storage.countUserScans(userId),
    storage.countUserScansSince(userId, new Date(Date.now() - SPEED_DEMON_WINDOW_MS)),
    storage.getMaxScanScoreForUser(userId),
    storage.getMaxFileCoverageForUser(userId),
    storage.getUserActiveSubscription(userId),
  ]);

  const isSub = !!subscription;
  const best = maxScore ?? 0;

  return {
    GUARDIAN: {
      current: Math.min(totalScans, 10),
      target: 10,
      hint: `${Math.min(totalScans, 10)}/10 scans`,
    },
    SPEED_DEMON: {
      current: Math.min(recentCount, 3),
      target: 3,
      hint: `${Math.min(recentCount, 3)}/3 scans in 1 min`,
    },
    FIRST_SCAN: {
      current: totalScans >= 1 ? 1 : 0,
      target: 1,
      hint: totalScans >= 1 ? "1/1" : "0/1 scans",
    },
    PERFECT_SCORE: {
      current: Math.min(best, 90),
      target: 90,
      hint: `Best score ${best} / 90`,
    },
    FULL_AUDIT: {
      current: Math.min(maxCoverage, 8),
      target: 8,
      hint: `${maxCoverage}/8 file types (best scan)`,
    },
    SUBSCRIBER: {
      current: isSub ? 1 : 0,
      target: 1,
      hint: isSub ? "Guardian active" : "Subscribe to Guardian",
    },
    ARCHITECT: {
      current: 0,
      target: 1,
      hint: "Validate llms.txt in the builder",
    },
  };
}

/**
 * One-time XP per builder type after successful validation; deduped via notifications.
 *
 * @param builderKey - Stable key matching {@link import("../../shared/gamification.js").BuilderValidationKey}
 */
export async function awardBuilderValidationXpIfUnique(
  userId: string,
  builderKey: string
): Promise<GamificationUpdate | null> {
  const already = await storage.hasBuilderValidationRecorded(userId, builderKey);
  if (already) {
    return null;
  }

  const update = await awardActionXP(
    userId,
    `builder_validation_${builderKey}`,
    XP_ACTION_AMOUNTS.BUILDER_VALIDATION
  );

  if (update) {
    await storage.createNotification({
      userId,
      type: "builder_validation",
      title: "Builder validation",
      message: `Recorded ${builderKey}`,
      changes: { builderKey } as Record<string, any>,
      isRead: true,
    });
  }

  return update;
}
