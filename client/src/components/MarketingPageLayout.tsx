// client/src/components/MarketingPageLayout.tsx
import { Link } from "wouter";
import { Shield, ChevronRight } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Seo } from "@/components/Seo";
import { ScannerCta } from "@/components/ScannerCta";
import { OvertureCTA } from "@/components/OvertureCTA";
import { usePrerenderReady } from "@/hooks/usePrerenderReady";
import type { SeoMetadata } from "@/lib/seo/types";

export interface Breadcrumb {
  label: string;
  href?: string;
}

interface MarketingPageLayoutProps {
  /** Resolved SEO metadata (title/description/canonical/JSON-LD). */
  config: SeoMetadata;
  /** Small uppercase eyebrow above the H1. */
  eyebrow?: string;
  /** Page H1. */
  title: string;
  /** Supporting lede under the H1. */
  subtitle?: string;
  /** Optional breadcrumb trail. */
  breadcrumbs?: Breadcrumb[];
  children: React.ReactNode;
}

/**
 * Shared shell for data-driven marketing pages (bot directory + guides).
 * Guarantees a scanner CTA above the fold and an Overture/Guardian CTA below,
 * plus SEO tags and the prerender-ready marker.
 */
export function MarketingPageLayout({
  config,
  eyebrow,
  title,
  subtitle,
  breadcrumbs,
  children,
}: MarketingPageLayoutProps) {
  usePrerenderReady();

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <Seo config={config} />
      <Navbar showDashboard={false} />

      <main className="container mx-auto px-6 pt-24 pb-16 max-w-3xl">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav
            aria-label="Breadcrumb"
            className="flex items-center flex-wrap gap-1 text-xs text-muted-foreground mb-6"
          >
            {breadcrumbs.map((crumb, index) => (
              <span key={`${crumb.label}-${index}`} className="flex items-center gap-1">
                {index > 0 && <ChevronRight className="w-3 h-3" />}
                {crumb.href ? (
                  <Link href={crumb.href}>
                    <a className="hover:text-primary transition-colors">{crumb.label}</a>
                  </Link>
                ) : (
                  <span className="text-foreground">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}

        <header className="mb-8">
          {eyebrow && (
            <p className="text-xs font-mono uppercase tracking-wider text-primary mb-3">
              {eyebrow}
            </p>
          )}
          <h1 className="font-heading text-3xl md:text-4xl font-bold tracking-tight mb-3">
            {title}
          </h1>
          {subtitle && (
            <p className="text-lg text-muted-foreground leading-relaxed">{subtitle}</p>
          )}
        </header>

        {/* Above-the-fold scanner CTA on every page */}
        <div className="mb-12">
          <ScannerCta />
        </div>

        <div className="space-y-10">{children}</div>

        {/* Lower-of-page conversion block */}
        <div className="mt-16">
          <OvertureCTA />
        </div>
      </main>

      <footer className="py-12 border-t border-border bg-card/30">
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 text-primary font-mono font-bold">
            <Shield className="w-5 h-5" />
            <span>AI BotCheck</span>
          </div>
          <div className="flex gap-8 text-sm text-muted-foreground">
            <Link href="/privacy"><a className="hover:text-primary">Privacy</a></Link>
            <Link href="/terms"><a className="hover:text-primary">Terms</a></Link>
            <a href="https://overture-systems.com" className="hover:text-primary">
              Overture Systems
            </a>
          </div>
          <div className="text-xs text-muted-foreground/50">
            © 2026 Overture Systems Solutions, LLC All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
