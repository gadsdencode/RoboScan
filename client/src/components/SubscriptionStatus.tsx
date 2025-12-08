// client/src/components/SubscriptionStatus.tsx
// Displays user's current subscription status with management options

import { AlertCircle, Calendar, CheckCircle, CreditCard, Loader2, XCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { useSubscription } from "../hooks/useSubscription";

interface SubscriptionStatusProps {
  className?: string;
  compact?: boolean;
}

export function SubscriptionStatus({ className = "", compact = false }: SubscriptionStatusProps) {
  const {
    subscription,
    subscriptionPlan,
    hasActiveSubscription,
    subscriptionLoading,
    openPortal,
    portalLoading,
    cancelSubscription,
    cancelLoading,
    reactivateSubscription,
    reactivateLoading,
    formatPrice,
  } = useSubscription();

  if (subscriptionLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // No active subscription
  if (!hasActiveSubscription || !subscription) {
    if (compact) {
      return (
        <div className={`flex items-center gap-2 text-muted-foreground ${className}`}>
          <XCircle className="h-4 w-4" />
          <span className="text-sm">No active subscription</span>
          <Button variant="link" size="sm" className="h-auto p-0" asChild>
            <a href="/pricing">Upgrade</a>
          </Button>
        </div>
      );
    }

    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Subscription
          </CardTitle>
          <CardDescription>You don't have an active subscription</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Subscribe to unlock premium features and get the most out of RoboScan.
          </p>
          <Button asChild>
            <a href="/pricing">View Plans</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Status badge colors
  const statusConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
    active: {
      color: "bg-green-500/10 text-green-500 border-green-500/20",
      icon: <CheckCircle className="h-4 w-4" />,
      label: "Active",
    },
    trialing: {
      color: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      icon: <Calendar className="h-4 w-4" />,
      label: "Trial",
    },
    past_due: {
      color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      icon: <AlertCircle className="h-4 w-4" />,
      label: "Past Due",
    },
    canceled: {
      color: "bg-red-500/10 text-red-500 border-red-500/20",
      icon: <XCircle className="h-4 w-4" />,
      label: "Canceled",
    },
    incomplete: {
      color: "bg-gray-500/10 text-gray-500 border-gray-500/20",
      icon: <AlertCircle className="h-4 w-4" />,
      label: "Incomplete",
    },
    paused: {
      color: "bg-orange-500/10 text-orange-500 border-orange-500/20",
      icon: <AlertCircle className="h-4 w-4" />,
      label: "Paused",
    },
  };

  const status = statusConfig[subscription.status] || statusConfig.incomplete;

  // Format dates
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <Badge variant="outline" className={status.color}>
          {status.icon}
          <span className="ml-1">{status.label}</span>
        </Badge>
        {subscriptionPlan && (
          <span className="text-sm font-medium">{subscriptionPlan.name}</span>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => openPortal()}
          disabled={portalLoading}
        >
          {portalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Manage"}
        </Button>
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Subscription
          </CardTitle>
          <Badge variant="outline" className={status.color}>
            {status.icon}
            <span className="ml-1">{status.label}</span>
          </Badge>
        </div>
        {subscriptionPlan && (
          <CardDescription>
            {subscriptionPlan.name} - {formatPrice(subscriptionPlan.amount, subscriptionPlan.currency)}/
            {subscriptionPlan.interval === "month" ? "month" : "year"}
          </CardDescription>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Cancellation warning */}
        {subscription.cancelAtPeriodEnd && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Subscription Ending</AlertTitle>
            <AlertDescription>
              Your subscription will end on {formatDate(subscription.currentPeriodEnd)}.
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 ml-2"
                onClick={() => reactivateSubscription()}
                disabled={reactivateLoading}
              >
                {reactivateLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Reactivate"
                )}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Past due warning */}
        {subscription.status === "past_due" && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Payment Required</AlertTitle>
            <AlertDescription>
              Your last payment failed. Please update your payment method to continue your subscription.
            </AlertDescription>
          </Alert>
        )}

        {/* Trial info */}
        {subscription.status === "trialing" && subscription.trialEnd && (
          <Alert>
            <Calendar className="h-4 w-4" />
            <AlertTitle>Trial Period</AlertTitle>
            <AlertDescription>
              Your free trial ends on {formatDate(subscription.trialEnd)}.
            </AlertDescription>
          </Alert>
        )}

        {/* Billing info */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Current Period</p>
            <p className="font-medium">
              {formatDate(subscription.currentPeriodStart)} - {formatDate(subscription.currentPeriodEnd)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Next Billing</p>
            <p className="font-medium">
              {subscription.cancelAtPeriodEnd
                ? "No renewal"
                : formatDate(subscription.currentPeriodEnd)}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            onClick={() => openPortal()}
            disabled={portalLoading}
            className="flex-1"
          >
            {portalLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              "Manage Billing"
            )}
          </Button>
          
          {!subscription.cancelAtPeriodEnd && subscription.status === "active" && (
            <Button
              variant="ghost"
              onClick={() => cancelSubscription()}
              disabled={cancelLoading}
              className="text-destructive hover:text-destructive"
            >
              {cancelLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Cancel"
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
