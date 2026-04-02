// client/src/hooks/useAccessControl.ts
// Hook for unified access control in the hybrid freemium model

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { useAuth } from "./useAuth";

// Types
export interface AccessLevel {
  tier: 'scout' | 'architect' | 'guardian';
  isSubscriber: boolean;
  hasAnyPurchase: boolean;
  isAdmin: boolean;
  // Feature access
  canAccessRecurringScans: boolean;
  canAccessScanComparison: boolean;
  canAccessUnlimitedHistory: boolean;
  hasXpMultiplier: boolean;
  xpMultiplier: number;
}

export interface ScanAccessInfo {
  isPurchased: boolean;
  isSubscriber: boolean;
  hasFullAccess: boolean;
}

export interface FieldAccess {
  hasAccess: boolean;
  reason: 'admin' | 'subscription' | 'purchase' | 'none';
}

/** Matches GET /api/user/access-summary */
interface AccessSummaryResponse {
  tier: 'scout' | 'architect' | 'guardian';
  /** Active paid subscription only (excludes admin); combine with `user.isAdmin` for full access checks */
  isSubscriber: boolean;
  isAdmin: boolean;
  hasAnyPurchase: boolean;
  llmsFieldPurchases: string[];
  robotsFieldPurchases: string[];
  hasScanPurchase: boolean;
  subscription: {
    status: string;
    planName: string | null;
    currentPeriodEnd: string | null;
  } | null;
}

async function fetchAccessSummary(): Promise<AccessSummaryResponse> {
  const response = await fetch("/api/user/access-summary", {
    credentials: "include",
  });

  if (!response.ok) {
    if (response.status === 401) {
      return {
        tier: "scout",
        isSubscriber: false,
        isAdmin: false,
        hasAnyPurchase: false,
        llmsFieldPurchases: [],
        robotsFieldPurchases: [],
        hasScanPurchase: false,
        subscription: null,
      };
    }
    throw new Error("Failed to fetch access summary");
  }

  return response.json();
}

/**
 * Main access control hook
 * Combines subscription status, purchases, and admin status
 */
export function useAccessControl() {
  const { user, isLoading: authLoading } = useAuth();

  const isAdmin = user?.isAdmin || false;

  const { data: accessSummary, isLoading: accessSummaryLoading } = useQuery({
    queryKey: queryKeys.userAccessSummary,
    queryFn: fetchAccessSummary,
    staleTime: 1000 * 60 * 5,
    enabled: !!user && !isAdmin,
  });

  const isSubscriber = isAdmin || (accessSummary?.isSubscriber ?? false);

  const hasAnyPurchase =
    isAdmin ||
    (accessSummary?.llmsFieldPurchases?.length ?? 0) > 0 ||
    (accessSummary?.robotsFieldPurchases?.length ?? 0) > 0 ||
    accessSummary?.hasScanPurchase === true;

  // Tier: guardian (subscriber) > architect (any purchase) > scout (free)
  const tier = isSubscriber ? 'guardian' : hasAnyPurchase ? 'architect' : 'scout';

  const accessLevel: AccessLevel = {
    tier,
    isSubscriber,
    hasAnyPurchase,
    isAdmin,
    canAccessRecurringScans: isSubscriber,
    canAccessScanComparison: isSubscriber,
    canAccessUnlimitedHistory: isSubscriber,
    hasXpMultiplier: isSubscriber,
    xpMultiplier: isSubscriber ? 2 : 1,
  };

  return {
    accessLevel,
    isLoading: authLoading || accessSummaryLoading,
    isSubscriber,
    isAdmin,
    tier,
  };
}

/**
 * Hook for checking access to a specific scan's full details
 */
export function useScanAccess(scanId: number | undefined, isPurchased?: boolean) {
  const { isSubscriber, isAdmin } = useAccessControl();

  // Admin or subscriber has full access to all scans
  // For specific scans, we also check if purchased
  const hasFullAccess = isAdmin || isSubscriber || isPurchased === true;

  return {
    hasFullAccess,
    isPurchased: isPurchased === true,
    isSubscriber,
    canViewDetails: hasFullAccess,
    canViewContent: hasFullAccess,
  };
}

/**
 * Hook for LLMS field access
 */
export function useLlmsFieldAccess() {
  const { isSubscriber, isAdmin } = useAccessControl();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.userAccessSummary,
    queryFn: fetchAccessSummary,
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !isAdmin, // Admin doesn't need to fetch - has all access
  });

  // If admin or subscriber, they have access to all fields
  const hasAllFieldsAccess = isAdmin || isSubscriber;
  const purchasedFields = data?.llmsFieldPurchases ?? [];

  /**
   * Check if user has access to a specific field
   */
  const hasFieldAccess = (fieldKey: string): boolean => {
    if (hasAllFieldsAccess) return true;
    return purchasedFields.includes(fieldKey);
  };

  return {
    hasAllFieldsAccess,
    purchasedFields,
    hasFieldAccess,
    isLoading,
    isSubscriber,
  };
}

/**
 * Hook for Robots field access
 */
export function useRobotsFieldAccess() {
  const { isSubscriber, isAdmin } = useAccessControl();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.userAccessSummary,
    queryFn: fetchAccessSummary,
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !isAdmin, // Admin doesn't need to fetch - has all access
  });

  // If admin or subscriber, they have access to all fields
  const hasAllFieldsAccess = isAdmin || isSubscriber;
  const purchasedFields = data?.robotsFieldPurchases ?? [];

  /**
   * Check if user has access to a specific field
   */
  const hasFieldAccess = (fieldKey: string): boolean => {
    if (hasAllFieldsAccess) return true;
    return purchasedFields.includes(fieldKey);
  };

  return {
    hasAllFieldsAccess,
    purchasedFields,
    hasFieldAccess,
    isLoading,
    isSubscriber,
  };
}

/**
 * Hook for recurring scans access
 * Recurring scans are subscription-only
 */
export function useRecurringScanAccess() {
  const { isSubscriber, isAdmin, isLoading } = useAccessControl();

  return {
    canCreateRecurringScans: isSubscriber || isAdmin,
    canViewRecurringScans: isSubscriber || isAdmin,
    isSubscriber,
    isLoading,
    requiresSubscription: !isSubscriber && !isAdmin,
  };
}
