import { useCallback } from "react";
import { toast } from "sonner";
import { emitGamificationEvent } from "@/lib/gamification-events";

/** Achievement row returned from scan gamification payloads */
export interface AchievementUnlockedSummary {
  key: string;
  name: string;
  xpReward: number;
}

/**
 * Gamification payload shape from API responses (scan jobs, sync scan, llms validation).
 */
export interface GamificationToastPayload {
  achievementsUnlocked?: AchievementUnlockedSummary[];
  /** Legacy llms.txt validation response */
  achievementUnlocked?: boolean;
  achievement?: { name: string; xpReward: number };
}

/**
 * Shows achievement unlock toasts for any gamification response that includes
 * newly unlocked achievements (scan flow or builder validation).
 */
export function useAchievementToast() {
  return useCallback((gamification?: GamificationToastPayload | null) => {
    if (!gamification) {
      return;
    }

    if (gamification.achievementsUnlocked && gamification.achievementsUnlocked.length > 0) {
      for (const a of gamification.achievementsUnlocked) {
        toast.success(`Achievement: ${a.name}`, {
          description: `+${a.xpReward} XP`,
          duration: 4000,
        });
      }
      emitGamificationEvent("achievement_unlocked", {
        keys: gamification.achievementsUnlocked.map((x) => x.key),
      });
    }

    if (gamification.achievementUnlocked && gamification.achievement) {
      toast.success("🏆 Achievement Unlocked!", {
        description: `You earned the "${gamification.achievement.name}" badge and ${gamification.achievement.xpReward} XP!`,
        duration: 5000,
      });
      emitGamificationEvent("achievement_unlocked", {
        name: gamification.achievement.name,
      });
    }
  }, []);
}
