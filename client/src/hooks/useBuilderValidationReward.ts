import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { emitGamificationEvent } from "@/lib/gamification-events";

export type NonLlmsBuilderKey =
  | "robots"
  | "sitemap"
  | "manifest"
  | "security"
  | "humans"
  | "ads"
  | "ai";

interface ValidateApiResponse {
  isValid: boolean;
  gamification: {
    xpGained?: number;
    totalXp?: number;
    newLevel?: number;
    levelUp?: boolean;
  } | null;
}

/**
 * After client-side validation passes, calls the server to award one-time builder validation XP.
 */
export function useBuilderValidationReward() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useCallback(
    async (builderKey: NonLlmsBuilderKey, content: string) => {
      if (!user) return;

      const res = await fetch("/api/builders/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ builderKey, content }),
      });

      if (!res.ok) return;

      const data = (await res.json()) as ValidateApiResponse;
      const g = data.gamification;
      if (!g?.xpGained) return;

      toast.success(`+${g.xpGained} XP`, {
        description: "Builder validation reward",
        duration: 3000,
      });

      emitGamificationEvent("xp_gained", { amount: g.xpGained, source: "builder_validation" });
      if (g.levelUp) {
        emitGamificationEvent("level_up", { newLevel: g.newLevel });
      }

      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/user/achievements"] });
    },
    [queryClient, user]
  );
}
