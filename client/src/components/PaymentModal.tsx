import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Lock, Sparkles, TrendingUp, FileText, Zap } from "lucide-react";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import confetti from "canvas-confetti";
import { PRICING } from "../../../shared/tiers";

/**
 * Format price for display with currency symbol
 * Uses server-provided amount when available, falls back to PRICING constant
 */
function formatPrice(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  scanId: number;
  url: string;
  onSuccess: () => void;
}

const triggerPurchaseConfetti = () => {
  const duration = 3 * 1000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

  const randomInRange = (min: number, max: number) => {
    return Math.random() * (max - min) + min;
  };

  const interval: any = setInterval(function() {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 50 * (timeLeft / duration);
    
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
    });
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
    });
  }, 250);
};

const CheckoutForm = ({ onSuccess, onClose, amount }: { onSuccess: () => void, onClose: () => void, amount: number }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const { error: submitError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}?payment=success`,
        },
        redirect: 'if_required',
      });

      if (submitError) {
        setError(submitError.message || 'Payment failed');
        setIsProcessing(false);
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        const response = await fetch('/api/confirm-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentIntentId: paymentIntent.id }),
          credentials: "include",
        });

        if (response.ok) {
          triggerPurchaseConfetti();
          onSuccess();
        } else {
          setError('Payment succeeded but confirmation failed. Please contact support.');
        }
        setIsProcessing(false);
      }
    } catch (err) {
      setError('An unexpected error occurred');
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isProcessing}
          className="flex-1"
          data-testid="button-cancel-payment"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!stripe || isProcessing}
          className="flex-1 btn-cta"
          data-testid="button-submit-payment"
        >
          {isProcessing ? (
            <span className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Processing...
            </span>
          ) : (
            `Pay ${formatPrice(amount)}`
          )}
        </Button>
      </div>
    </form>
  );
};

export function PaymentModal({ isOpen, onClose, scanId, url, onSuccess }: PaymentModalProps) {
  const [clientSecret, setClientSecret] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [alreadyPurchased, setAlreadyPurchased] = useState(false);
  // Use server-provided amount, fallback to centralized PRICING constant
  const [amount, setAmount] = useState<number>(PRICING.REPORT_UNLOCK);

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    fetch('/api/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scanId }),
      credentials: "include",
    })
      .then(res => res.json())
      .then(data => {
        if (data.alreadyPurchased) {
          setAlreadyPurchased(true);
          setTimeout(() => {
            onSuccess();
          }, 1500);
        } else {
          setClientSecret(data.clientSecret);
          // Use server-provided amount for consistency
          if (data.amount) {
            setAmount(data.amount);
          }
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [isOpen, scanId, onSuccess]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/95 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-2xl"
        >
          <Card className="bg-card border border-border p-0 overflow-hidden">
            <div className="relative bg-card p-6 border-b border-border">
              <button
                title="Close"
                onClick={onClose}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
                data-testid="button-close-modal"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/20 rounded-xl">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold mb-2">Unlock Your Optimization Report</h2>
                  <p className="text-muted-foreground">
                    Get actionable insights and ready-to-use files for <span className="text-primary font-mono">{url}</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6">
              {alreadyPurchased ? (
                <div className="py-8 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/20 rounded-full mb-4">
                    <Check className="w-8 h-8 text-green-400" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Already Purchased!</h3>
                  <p className="text-muted-foreground">Loading your optimization report...</p>
                </div>
              ) : (
                <>
                  <div className="grid md:grid-cols-2 gap-6 mb-6">
                    <div className="space-y-4">
                      <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wide">What You'll Get</h3>
                      
                      {[
                        { icon: FileText, title: "Ready-to-Use Files", desc: "Download optimized robots.txt & llms.txt" },
                        { icon: TrendingUp, title: "SEO Impact Analysis", desc: "See how changes affect your rankings" },
                        { icon: Zap, title: "Priority Action Plan", desc: "Step-by-step fix checklist" },
                      ].map((feature, i) => (
                        <div key={i} className="flex gap-3">
                          <div className="mt-0.5 flex-shrink-0 p-2 bg-primary/10 rounded-lg h-fit">
                            <feature.icon className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <div className="font-semibold text-sm">{feature.title}</div>
                            <div className="text-xs text-muted-foreground">{feature.desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-4">
                      <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
                        <div className="flex items-baseline gap-2 mb-2">
                          <span className="text-3xl font-bold">{formatPrice(amount)}</span>
                          <span className="text-muted-foreground text-sm">one-time</span>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div className="flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            Secure payment via Stripe
                          </div>
                          <div>✓ Instant delivery</div>
                          <div>✓ 30-day money-back guarantee</div>
                        </div>
                      </div>

                      <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                        <div className="text-xs font-semibold text-yellow-400 mb-1">⚡ Limited Time</div>
                        <div className="text-xs text-muted-foreground">
                          Early adopter price. Regular price: $29.99
                        </div>
                      </div>
                    </div>
                  </div>

                  {loading ? (
                    <div className="py-12 flex flex-col items-center justify-center">
                      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                      <p className="text-sm text-muted-foreground">Preparing secure checkout...</p>
                    </div>
                  ) : clientSecret ? (
                    <Elements stripe={stripePromise} options={{ clientSecret }}>
                      <CheckoutForm onSuccess={onSuccess} onClose={onClose} amount={amount} />
                    </Elements>
                  ) : (
                    <div className="text-center py-8 text-red-400">
                      Failed to initialize payment. Please try again.
                    </div>
                  )}
                </>
              )}
            </div>
          </Card>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
