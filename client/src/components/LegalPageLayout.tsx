import { Shield, ArrowLeft, AlertTriangle } from "lucide-react";
import { Link } from "wouter";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Seo } from "@/components/Seo";
import { usePrerenderReady } from "@/hooks/usePrerenderReady";
import type { SeoRouteKey } from "@/lib/seo/types";

const LEGAL_CONTACT_EMAIL = "jordan.martens@osscontact.com";

interface LegalPageLayoutProps {
  seoRoute: Extract<SeoRouteKey, "privacy" | "terms">;
  title: string;
  effectiveDate: string;
  children: React.ReactNode;
}

export function LegalPageLayout({
  seoRoute,
  title,
  effectiveDate,
  children,
}: LegalPageLayoutProps) {
  usePrerenderReady();

  return (
    <div className="min-h-screen bg-background">
      <Seo route={seoRoute} />

      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/">
            <a className="flex items-center gap-2 text-primary font-heading text-xl font-bold tracking-tighter">
              <Shield className="w-6 h-6" />
              <span>AI BotCheck</span>
            </a>
          </Link>
          <Link href="/">
            <a className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </a>
          </Link>
        </div>
      </nav>

      <main className="container mx-auto px-6 pt-24 pb-16 max-w-3xl">
        <Alert className="mb-8 border-amber-500/50 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertTitle className="text-amber-200">Template — Not Legal Advice</AlertTitle>
          <AlertDescription className="text-muted-foreground">
            This document is a starting template for AI BotCheck (Overture Systems
            Solutions, LLC). It is not legal advice and has not been reviewed by an
            attorney. Have qualified legal counsel review and customize it before
            relying on it.
          </AlertDescription>
        </Alert>

        <header className="mb-10">
          <h1 className="font-heading text-3xl md:text-4xl font-bold tracking-tight mb-3">
            {title}
          </h1>
          <p className="text-sm font-mono text-muted-foreground">
            Effective date: {effectiveDate}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Operated by Overture Systems Solutions, LLC
          </p>
        </header>

        <div className="space-y-8 text-muted-foreground leading-relaxed [&_h2]:text-foreground [&_h2]:font-heading [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-2 [&_h2]:mb-3 [&_h3]:text-foreground [&_h3]:font-medium [&_h3]:text-base [&_h3]:mb-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1 [&_a]:text-primary [&_a]:hover:underline">
          {children}
        </div>

        <footer className="mt-12 pt-8 border-t border-border text-sm text-muted-foreground">
          <p>
            Questions? Contact{" "}
            <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>
          </p>
        </footer>
      </main>
    </div>
  );
}
