// client/src/hooks/useSubscription.ts
// Hook for managing Stripe subscriptions

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "./use-toast";

// Types
export interface SubscriptionPlan {
  id: number;
  stripePriceId: string;
  stripeProductId: string;
  name: string;
  description: string | null;
  amount: number; // in cents
  currency: string;
  interval: "month" | "year";
  intervalCount: number;
  features: string[];
  isActive: boolean;
  sortOrder: number;
}

export interface Subscription {
  id: number;
  userId: string;
  stripeSubscriptionId: string;
  stripePriceId: string;
  stripeProductId: string | null;
  status: "active" | "canceled" | "past_due" | "trialing" | "incomplete" | "paused";
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  trialStart: string | null;
  trialEnd: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CurrentSubscriptionResponse {
  subscription: Subscription | null;
  plan: SubscriptionPlan | null;
  hasActiveSubscription: boolean;
}

interface CheckoutSessionResponse {
  sessionId: string;
  url: string;
}

interface PortalSessionResponse {
  url: string;
}

// API functions
async function fetchSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const response = await fetch("/api/subscriptions/plans", {
    credentials: "include",
  });
  
  if (!response.ok) {
    throw new Error("Failed to fetch subscription plans");
  }
  
  const data = await response.json();
  return data.plans;
}

async function fetchCurrentSubscription(): Promise<CurrentSubscriptionResponse> {
  const response = await fetch("/api/subscriptions/current", {
    credentials: "include",
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      return { subscription: null, plan: null, hasActiveSubscription: false };
    }
    throw new Error("Failed to fetch subscription status");
  }
  
  return response.json();
}

async function createCheckoutSession(priceId: string): Promise<CheckoutSessionResponse> {
  const response = await fetch("/api/subscriptions/create-checkout-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ priceId }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to create checkout session");
  }
  
  return response.json();
}

async function createPortalSession(): Promise<PortalSessionResponse> {
  const response = await fetch("/api/subscriptions/create-portal-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({}),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to create portal session");
  }
  
  return response.json();
}

async function cancelSubscription(): Promise<void> {
  const response = await fetch("/api/subscriptions/cancel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to cancel subscription");
  }
}

async function reactivateSubscription(): Promise<void> {
  const response = await fetch("/api/subscriptions/reactivate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to reactivate subscription");
  }
}

// Hook
export function useSubscription() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch available plans
  const plansQuery = useQuery({
    queryKey: ["subscription-plans"],
    queryFn: fetchSubscriptionPlans,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch current subscription
  const currentSubscriptionQuery = useQuery({
    queryKey: ["current-subscription"],
    queryFn: fetchCurrentSubscription,
    staleTime: 1000 * 60 * 1, // 1 minute
  });

  // Create checkout session mutation
  const checkoutMutation = useMutation({
    mutationFn: createCheckoutSession,
    onSuccess: (data) => {
      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Checkout Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create portal session mutation
  const portalMutation = useMutation({
    mutationFn: createPortalSession,
    onSuccess: (data) => {
      // Redirect to Stripe Customer Portal
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Portal Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Cancel subscription mutation
  const cancelMutation = useMutation({
    mutationFn: cancelSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["current-subscription"] });
      toast({
        title: "Subscription Canceled",
        description: "Your subscription will end at the current billing period.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Cancellation Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Reactivate subscription mutation
  const reactivateMutation = useMutation({
    mutationFn: reactivateSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["current-subscription"] });
      toast({
        title: "Subscription Reactivated",
        description: "Your subscription has been reactivated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Reactivation Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Helper function to format price
  const formatPrice = (amount: number, currency: string = "usd") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  return {
    // Queries
    plans: plansQuery.data || [],
    plansLoading: plansQuery.isLoading,
    plansError: plansQuery.error,
    
    subscription: currentSubscriptionQuery.data?.subscription,
    subscriptionPlan: currentSubscriptionQuery.data?.plan,
    hasActiveSubscription: currentSubscriptionQuery.data?.hasActiveSubscription || false,
    subscriptionLoading: currentSubscriptionQuery.isLoading,
    subscriptionError: currentSubscriptionQuery.error,
    
    // Mutations
    startCheckout: checkoutMutation.mutate,
    checkoutLoading: checkoutMutation.isPending,
    
    openPortal: portalMutation.mutate,
    portalLoading: portalMutation.isPending,
    
    cancelSubscription: cancelMutation.mutate,
    cancelLoading: cancelMutation.isPending,
    
    reactivateSubscription: reactivateMutation.mutate,
    reactivateLoading: reactivateMutation.isPending,
    
    // Helpers
    formatPrice,
    refetchSubscription: () => queryClient.invalidateQueries({ queryKey: ["current-subscription"] }),
  };
}
