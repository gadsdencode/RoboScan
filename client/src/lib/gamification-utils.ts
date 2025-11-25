/**
 * Calculates the progress percentage towards the next level.
 * Formula matches backend: Level = floor(sqrt(XP / 100)) + 1
 */
export function getLevelProgress(xp: number, level: number): number {
  // XP required to reach the CURRENT level
  // Inverse of Level formula: XP = 100 * (Level - 1)^2
  const currentLevelBaseXp = 100 * Math.pow(level - 1, 2);
  
  // XP required to reach the NEXT level
  const nextLevelBaseXp = 100 * Math.pow(level, 2);
  
  // Total XP needed for this specific level
  const xpNeededForLevel = nextLevelBaseXp - currentLevelBaseXp;
  
  // XP earned within this level
  const xpInCurrentLevel = xp - currentLevelBaseXp;
  
  // Calculate percentage (0-100)
  if (xpNeededForLevel === 0) return 100; // Edge case for level 1 start
  const percentage = (xpInCurrentLevel / xpNeededForLevel) * 100;
  
  return Math.min(100, Math.max(0, percentage));
}

export function getNextLevelXp(level: number): number {
  return 100 * Math.pow(level, 2);
}
