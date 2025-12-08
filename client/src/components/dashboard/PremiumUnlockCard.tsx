// client/src/components/dashboard/PremiumUnlockCard.tsx
import {
  Lock,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ScanWithPurchase } from "./ScanList";

interface PremiumUnlockCardProps {
  scan: ScanWithPurchase;
  onUnlock: (scan: ScanWithPurchase) => void;
  /** Optional: Add variant prop for A/B testing different layouts */
  variant?: "default" | "compact" | "featured";
}

/**
 * Premium unlock card component - displays the upgrade CTA for unpurchased scans.
 * 
 * This component is intentionally extracted to enable:
 * - A/B testing different layouts (e.g., "Most Popular" badge, different pricing displays)
 * - Easy modification of unlock UI without touching scan card logic
 * - Independent testing and iteration on conversion optimization
 */
export function PremiumUnlockCard({ 
  scan, 
  onUnlock,
  variant = "default" 
}: PremiumUnlockCardProps) {
  // Future: Add variant-specific rendering logic here
  // Example: if (variant === "featured") return <FeaturedUnlockCard ... />

  return (
    <div className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/30 rounded-lg">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-primary/20 rounded-lg">
          <Lock className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-lg mb-2 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Premium Optimization Report
          </h4>
          <p className="text-sm text-muted-foreground mb-4">
            Unlock comprehensive insights and downloadable files:
          </p>
          <PremiumFeaturesList />
          <UnlockActions scan={scan} onUnlock={onUnlock} />
        </div>
      </div>
    </div>
  );
}

/** Feature list for premium unlock card - extracted for easy A/B testing of features */
function PremiumFeaturesList() {
  const features = [
    { text: <>Full <span className="font-semibold font-mono">robots.txt</span> content with validation</> },
    { text: <>Complete <span className="font-semibold font-mono">llms.txt</span> file analysis</> },
    { text: "Detailed bot permissions breakdown" },
    { text: "Downloadable optimization recommendations" },
    { text: "Ready-to-use configuration files" },
  ];

  return (
    <div className="grid gap-2 mb-4">
      {features.map((feature, index) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
          <span>{feature.text}</span>
        </div>
      ))}
    </div>
  );
}

interface UnlockActionsProps {
  scan: ScanWithPurchase;
  onUnlock: (scan: ScanWithPurchase) => void;
}

/** CTA button and pricing info - extracted for easy A/B testing of pricing display */
function UnlockActions({ scan, onUnlock }: UnlockActionsProps) {
  return (
    <div className="flex items-center gap-3">
      <Button
        onClick={() => onUnlock(scan)}
        className="btn-cta"
        data-testid={`button-unlock-${scan.id}`}
      >
        <Sparkles className="w-4 h-4 mr-2" />
        Unlock for $9.99
      </Button>
      <span className="text-xs text-muted-foreground">One-time payment • Instant access</span>
    </div>
  );
}
