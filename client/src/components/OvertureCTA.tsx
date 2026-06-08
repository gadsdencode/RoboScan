// client/src/components/OvertureCTA.tsx
import { Sparkles, ArrowRight, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const HIGHLIGHTS = [
  "All 8 technical files (robots.txt, llms.txt & more)",
  "Big 7 LLM compatibility report",
  "Recurring scans & change alerts",
];

/**
 * Lower-of-page conversion block promoting AI BotCheck Guardian.
 * Static and ungated — safe to prerender on every marketing page.
 */
export function OvertureCTA() {
  return (
    <section
      className="rounded-2xl border border-primary/20 bg-linear-to-br from-primary/10 to-blue-500/10 p-8 md:p-10 text-center"
      data-testid="overture-cta"
    >
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 border border-primary/30 text-primary text-xs font-mono mb-4">
        <Sparkles className="w-3 h-3" />
        AI BotCheck Guardian
      </div>

      <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-3">
        Generate every AI-readiness file in minutes
      </h2>
      <p className="text-muted-foreground max-w-xl mx-auto mb-6">
        Stop hand-editing robots.txt. Guardian audits your site and generates
        production-ready files so the major AI crawlers can find, understand,
        and cite your content.
      </p>

      <ul className="flex flex-col sm:flex-row sm:flex-wrap justify-center gap-3 mb-8 text-sm">
        {HIGHLIGHTS.map((item) => (
          <li key={item} className="flex items-center gap-2 text-muted-foreground">
            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      <Button asChild size="lg" className="font-semibold">
        <a href="/pricing" data-testid="overture-cta-button">
          Explore Guardian
          <ArrowRight className="w-4 h-4" />
        </a>
      </Button>
    </section>
  );
}
