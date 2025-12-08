// client/src/components/SubscriptionPlans.tsx
// Displays available subscription plans with pricing

import { Check, Loader2, Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { useSubscription, type SubscriptionPlan } from "../hooks/useSubscription";
import { useAuth } from "../hooks/useAuth";

interface SubscriptionPlansProps {
  showCurrentPlan?: boolean;
  className?: string;
}

export function SubscriptionPlans({ showCurrentPlan = true, className = "" }: SubscriptionPlansProps) {
  const { user } = useAuth();
  const {
    plans,
    plansLoading,
    subscription,
    hasActiveSubscription,
    startCheckout,
    checkoutLoading,
    openPortal,
    portalLoading,
    formatPrice,
  } = useSubscription();

  if (plansLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!plans.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No subscription plans available at the moment.</p>
      </div>
    );
  }

  const handleSubscribe = (priceId: string) => {
    if (!user) {
      window.location.href = "/login?redirect=/pricing";
      return;
    }
    startCheckout(priceId);
  };

  const isCurrentPlan = (plan: SubscriptionPlan) => {
    return subscription?.stripePriceId === plan.stripePriceId;
  };

  return (
    <div className={`grid gap-6 md:grid-cols-2 lg:grid-cols-3 ${className}`}>
      {plans.map((plan) => (
        <Card
          key={plan.id}
          className={`relative flex flex-col ${
            isCurrentPlan(plan) ? "border-primary shadow-lg" : ""
          }`}
        >
          {isCurrentPlan(plan) && showCurrentPlan && (
            <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
              Current Plan
            </Badge>
          )}
          
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {plan.name}
            </CardTitle>
            <CardDescription>{plan.description}</CardDescription>
          </CardHeader>
          
          <CardContent className="flex-1">
            <div className="mb-6">
              <span className="text-4xl font-bold">
                {formatPrice(plan.amount, plan.currency)}
              </span>
              <span className="text-muted-foreground">
                /{plan.interval === "month" ? "mo" : "yr"}
              </span>
            </div>
            
            {plan.features && plan.features.length > 0 && (
              <ul className="space-y-3">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
          
          <CardFooter>
            {isCurrentPlan(plan) ? (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => openPortal()}
                disabled={portalLoading}
              >
                {portalLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Manage Subscription"
                )}
              </Button>
            ) : hasActiveSubscription ? (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => openPortal()}
                disabled={portalLoading}
              >
                {portalLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Change Plan"
                )}
              </Button>
            ) : (
              <Button
                className="w-full"
                onClick={() => handleSubscribe(plan.stripePriceId)}
                disabled={checkoutLoading}
              >
                {checkoutLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Subscribe"
                )}
              </Button>
            )}
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
