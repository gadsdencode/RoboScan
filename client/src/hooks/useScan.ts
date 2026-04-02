import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { calculateLevel } from "@shared/gamification";

interface ScanParams {
  url: string;
  tags?: string[];
}

/**
 * Poll for async scan job completion
 */
async function pollForScanCompletion(jobId: string, maxAttempts = 120): Promise<any> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const res = await fetch(`/api/scan-jobs/${jobId}/status`, {
      credentials: "include",
    });
    
    if (!res.ok) {
      throw new Error('Failed to get scan status');
    }
    
    const status = await res.json();
    
    if (status.status === 'completed' && status.result) {
      return status.result;
    }
    
    if (status.status === 'failed') {
      throw new Error(status.error || 'Scan failed');
    }
  }
  
  throw new Error('Scan timed out');
}

export function useScan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ url, tags }: ScanParams) => {
      // Use async mode for better reliability on Vercel
      const res = await fetch("/api/scan?async=true", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, tags }),
        credentials: "include",
      });
      
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || "Scan failed");
      }
      
      // Handle async mode (202) vs sync mode (200)
      if (res.status === 202) {
        const asyncData = await res.json();
        return await pollForScanCompletion(asyncData.jobId);
      }
      
      return res.json();
    },
    // [OPTIMISTIC UI] Update HUD instantly
    onMutate: async ({ url: newUrl }) => {
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
    onError: (err, { url: newUrl }, context) => {
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
