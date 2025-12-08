// client/src/hooks/useAccessControl.ts
// Hook for unified access control in the hybrid freemium model

import { useQuery } from "@tanstack/react-query";
import { useSubscription } from "./useSubscription";
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

// Fetch field purchases for LLMS
async function fetchLlmsFieldPurchases(): Promise<{
  purchases: Array<{ fieldKey: string }>;
  hasSubscription: boolean;
  hasAllFieldsAccess: boolean;
}> {
  const response = await fetch("/api/llms-fields/purchases", {
    credentials: "include",
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      return { purchases: [], hasSubscription: false, hasAllFieldsAccess: false };
    }
    throw new Error("Failed to fetch LLMS field purchases");
  }
  
  return response.json();
}

// Fetch field purchases for Robots
async function fetchRobotsFieldPurchases(): Promise<{
  purchases: Array<{ fieldKey: string }>;
  hasSubscription: boolean;
  hasAllFieldsAccess: boolean;
}> {
  const response = await fetch("/api/robots-fields/purchases", {
    credentials: "include",
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      return { purchases: [], hasSubscription: false, hasAllFieldsAccess: false };
    }
    throw new Error("Failed to fetch robots field purchases");
  }
  
  return response.json();
}

/**
 * Main access control hook
 * Combines subscription status, purchases, and admin status
 */
export function useAccessControl() {
  const { user, isLoading: authLoading } = useAuth();
  const { hasActiveSubscription, subscriptionLoading } = useSubscription();
  
  // Determine if user is admin (check user object)
  const isAdmin = user?.isAdmin || false;
  
  // Calculate tier
  const tier = hasActiveSubscription || isAdmin ? 'guardian' : 'scout';
  const isSubscriber = hasActiveSubscription || isAdmin;
  
  // Feature access based on tier
  const accessLevel: AccessLevel = {
    tier,
    isSubscriber,
    hasAnyPurchase: false, // Will be updated when we check purchases
    isAdmin,
    // Subscription-only features
    canAccessRecurringScans: isSubscriber,
    canAccessScanComparison: isSubscriber,
    canAccessUnlimitedHistory: isSubscriber,
    hasXpMultiplier: isSubscriber,
    xpMultiplier: isSubscriber ? 2 : 1,
  };
  
  return {
    accessLevel,
    isLoading: authLoading || subscriptionLoading,
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
    queryKey: ["llms-field-access"],
    queryFn: fetchLlmsFieldPurchases,
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !isAdmin, // Admin doesn't need to fetch - has all access
  });
  
  // If admin or subscriber, they have access to all fields
  const hasAllFieldsAccess = isAdmin || isSubscriber || data?.hasAllFieldsAccess || false;
  const purchasedFields = data?.purchases?.map(p => p.fieldKey) || [];
  
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
    queryKey: ["robots-field-access"],
    queryFn: fetchRobotsFieldPurchases,
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !isAdmin, // Admin doesn't need to fetch - has all access
  });
  
  // If admin or subscriber, they have access to all fields
  const hasAllFieldsAccess = isAdmin || isSubscriber || data?.hasAllFieldsAccess || false;
  const purchasedFields = data?.purchases?.map(p => p.fieldKey) || [];
  
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

