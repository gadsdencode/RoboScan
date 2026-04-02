import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { calculateLevel } from "@shared/gamification";
import { queryKeys } from "@/lib/queryKeys";
import {
  runScanToCompletion,
  type ScanCompletionResult,
  type ScanWebsiteParams,
  DEFAULT_SCAN_MAX_POLL_ATTEMPTS,
  DEFAULT_SCAN_POLL_INTERVAL_MS,
} from "@/lib/scan-client";

export interface UseScanMutationOptions {
  pollIntervalMs?: number;
  maxPollAttempts?: number;
}

export function useScanMutation(options: UseScanMutationOptions = {}) {
  const queryClient = useQueryClient();
  const pollIntervalMs =
    options.pollIntervalMs ?? DEFAULT_SCAN_POLL_INTERVAL_MS;
  const maxPollAttempts =
    options.maxPollAttempts ?? DEFAULT_SCAN_MAX_POLL_ATTEMPTS;

  return useMutation({
    mutationFn: async (params: ScanWebsiteParams): Promise<ScanCompletionResult> => {
      return runScanToCompletion(params, {
        async: true,
        pollIntervalMs,
        maxAttempts: maxPollAttempts,
      });
    },
    onMutate: async ({ url: _newUrl }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.auth.user });
      const previousUser = queryClient.getQueryData<User>(queryKeys.auth.user);

      if (previousUser) {
        const estimatedXpGain = 10;
        const newXp = (previousUser.xp || 0) + estimatedXpGain;
        const newLevel = calculateLevel(newXp);

        queryClient.setQueryData<User>(queryKeys.auth.user, {
          ...previousUser,
          xp: newXp,
          level: newLevel,
        });
      }

      return { previousUser };
    },
    onError: (_err, _params, context) => {
      if (context?.previousUser) {
        queryClient.setQueryData(queryKeys.auth.user, context.previousUser);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.user });
      queryClient.invalidateQueries({ queryKey: queryKeys.userScans.root });
    },
  });
}
