import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { calculateLevel } from "@shared/gamification";

export function useScan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (url: string) => {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) throw new Error("Scan failed");
      return res.json();
    },
    // [OPTIMISTIC UI] Update HUD instantly
    onMutate: async (newUrl) => {
      // 1. Cancel outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ["/api/auth/user"] });

      // 2. Snapshot the previous value
      const previousUser = queryClient.getQueryData<User>(["/api/auth/user"]);

      // 3. Optimistically update to the new value
      if (previousUser) {
        // Assume a base XP gain (e.g., 10 XP) to give instant gratification
        // The server will correct this to the actual amount (e.g. +50) shortly after
        const estimatedXpGain = 10; 
        const newXp = (previousUser.xp || 0) + estimatedXpGain;
        const newLevel = calculateLevel(newXp);

        queryClient.setQueryData<User>(["/api/auth/user"], {
          ...previousUser,
          xp: newXp,
          level: newLevel,
        });
      }

      return { previousUser };
    },
    // [ROLLBACK] If error, revert to snapshot
    onError: (err, newUrl, context) => {
      if (context?.previousUser) {
        queryClient.setQueryData(["/api/auth/user"], context.previousUser);
      }
    },
    // [SETTLE] Always refetch after error or success to ensure server sync
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      // Also refresh scans list
      queryClient.invalidateQueries({ queryKey: ["/api/user/scans"] });
    },
  });
}
