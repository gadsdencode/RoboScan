import type { QueryClient } from "@tanstack/react-query";

/**
 * Central query keys for React Query. Prefer importing from here so invalidation
 * stays consistent (e.g. all user scan lists share the "user-scans" prefix).
 */
export const queryKeys = {
  auth: {
    user: ["/api/auth/user"] as const,
  },
  achievements: ["/api/user/achievements"] as const,
  userScans: {
    /** Prefix: invalidates every scans list query regardless of tag filter */
    root: ["user-scans"] as const,
    list: (tags?: string[]) =>
      [
        "user-scans",
        {
          tags: tags?.length ? [...tags].sort().join("\0") : "",
        },
      ] as const,
  },
  userTags: ["user-tags"] as const,
  notifications: {
    list: ["notifications"] as const,
    unreadCount: ["notifications", "unread-count"] as const,
  },
  recurringScans: {
    list: ["recurring-scans"] as const,
  },
  recurringPreferences: (recurringScanId: number) =>
    ["recurring-scans", recurringScanId, "preferences"] as const,
  scanDetail: (scanId: number) => ["scans", "detail", scanId] as const,
  subscriptionPlans: ["subscription-plans"] as const,
  currentSubscription: ["current-subscription"] as const,
  userAccessSummary: ["user-access-summary"] as const,
} as const;

/** @deprecated Use queryKeys.userAccessSummary — kept for existing imports */
export const USER_ACCESS_SUMMARY_QUERY_KEY = queryKeys.userAccessSummary;

export function invalidateUserScans(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: queryKeys.userScans.root });
}
