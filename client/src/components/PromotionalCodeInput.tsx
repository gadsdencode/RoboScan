// client/src/components/PromotionalCodeInput.tsx
// Input component for redeeming promotional codes for free premium subscription time

import { useState } from "react";
import { Gift, Loader2, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { toast } from "sonner";

interface PromotionalCodeInputProps {
  onSuccess?: () => void;
  className?: string;
}

interface RedemptionResponse {
  success: boolean;
  message: string;
  monthsFree: number;
  newPeriodEnd: string;
  isNewSubscription: boolean;
}

export function PromotionalCodeInput({ onSuccess, className = "" }: PromotionalCodeInputProps) {
  const [code, setCode] = useState("");
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleRedeem = async () => {
    if (!code.trim()) {
      setError("Please enter a promotional code");
      return;
    }

    setIsRedeeming(true);
    setError(null);

    try {
      const response = await fetch("/api/promotional-codes/redeem", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Failed to redeem code");
        toast.error("Code Redemption Failed", {
          description: data.message || "Please check the code and try again.",
        });
        return;
      }

      const result = data as RedemptionResponse;
      
      setSuccess(true);
      setCode("");
      
      // Show success toast with celebration
      toast.success(
        result.isNewSubscription 
          ? "Welcome to Premium!" 
          : "Subscription Extended!",
        {
          description: result.message,
          duration: 6000,
          icon: <Sparkles className="h-5 w-5 text-yellow-400" />,
        }
      );

      // Call success callback to refresh subscription data
      if (onSuccess) {
        onSuccess();
      }

      // Reset success state after animation
      setTimeout(() => {
        setSuccess(false);
      }, 3000);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Network error. Please try again.";
      setError(errorMessage);
      toast.error("Error", {
        description: errorMessage,
      });
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isRedeeming && code.trim()) {
      handleRedeem();
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Gift className="h-4 w-4 text-primary" />
        <span>Have a promotional code?</span>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            type="text"
            placeholder="Enter code"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setError(null);
            }}
            onKeyDown={handleKeyDown}
            disabled={isRedeeming || success}
            className={`
              uppercase tracking-wider font-mono text-sm
              ${error ? "border-red-500 focus-visible:ring-red-500" : ""}
              ${success ? "border-green-500 bg-green-500/10" : ""}
            `}
            maxLength={50}
          />
          {success && (
            <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
          )}
        </div>
        
        <Button
          onClick={handleRedeem}
          disabled={isRedeeming || !code.trim() || success}
          variant={success ? "outline" : "default"}
          className={`
            min-w-[100px]
            ${success ? "border-green-500 text-green-500" : ""}
          `}
        >
          {isRedeeming ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Redeeming...
            </>
          ) : success ? (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Redeemed!
            </>
          ) : (
            "Redeem"
          )}
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-500">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

