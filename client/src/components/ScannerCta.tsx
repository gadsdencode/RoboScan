// client/src/components/ScannerCta.tsx
import { useState, type FormEvent } from "react";
import { Search, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ScannerCtaProps {
  /** Optional override for the headline. */
  heading?: string;
  /** Optional supporting line. */
  subheading?: string;
}

/**
 * Above-the-fold "Check your site free" call to action.
 * Hands off to the home-page scanner (no auth, no payment).
 */
export function ScannerCta({
  heading = "Check your site free",
  subheading = "See which AI bots can crawl your site in under 3 minutes — no signup, no credit card.",
}: ScannerCtaProps) {
  const [url, setUrl] = useState("");

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    // Simple, prerender-safe handoff to the home-page scanner.
    window.location.href = "/";
  };

  return (
    <section
      className="rounded-2xl border border-primary/30 bg-linear-to-br from-primary/10 via-card to-card p-6 md:p-8 shadow-lg shadow-primary/5"
      data-testid="scanner-cta"
    >
      <div className="flex items-start gap-3 mb-4">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">{heading}</h2>
          <p className="text-sm text-muted-foreground mt-1">{subheading}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            inputMode="url"
            placeholder="example.com"
            className="h-11 pl-9 font-mono"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            aria-label="Your website URL"
            data-testid="scanner-cta-input"
          />
        </div>
        <Button type="submit" size="lg" className="h-11 font-semibold" data-testid="scanner-cta-button">
          Scan my site free
          <ArrowRight className="w-4 h-4" />
        </Button>
      </form>
    </section>
  );
}
