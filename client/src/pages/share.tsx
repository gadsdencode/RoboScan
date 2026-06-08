// client/src/pages/share.tsx
// Public, read-only shared scan result at /s/:token. Renders the reusable
// ScoreCard from the non-sensitive summary endpoint. Server-side OG meta is
// injected by the Express /s/:token handler for social crawlers; this client
// view also sets helmet meta for in-app navigation.
import { useEffect, useState } from "react";
import { Share2, Loader2 } from "lucide-react";
import { MarketingPageLayout } from "@/components/MarketingPageLayout";
import { ScoreCard } from "@/components/ScoreCard";
import { ShareScoreDialog } from "@/components/ShareScoreDialog";
import { Button } from "@/components/ui/button";
import { SITE_ORIGIN } from "@/lib/seo/constants";
import type { SeoMetadata } from "@/lib/seo/types";
import type { PublicScanSummary } from "@shared/publicScanSummary";
import NotFound from "@/pages/not-found";

interface SharePageProps {
  token: string;
}

type LoadState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; summary: PublicScanSummary };

export default function SharePage({ token }: SharePageProps) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });

    fetch(`/api/share/${encodeURIComponent(token)}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((summary: PublicScanSummary) => {
        if (!cancelled) setState({ status: "ready", summary });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error" });
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (state.status === "error") {
    return <NotFound />;
  }

  if (state.status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const { summary } = state;
  const config: SeoMetadata = {
    title: `${summary.headline} | AI BotCheck`,
    description: `${summary.hostname} scored ${summary.score}/100 (Grade ${summary.grade}) for AI visibility. See which AI bots can access the site and check your own for free.`,
    canonicalPath: `/s/${token}`,
    ogImage: `${SITE_ORIGIN}/api/og?token=${encodeURIComponent(token)}`,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: summary.headline,
      url: `${SITE_ORIGIN}/s/${token}`,
    },
  };

  return (
    <MarketingPageLayout
      config={config}
      eyebrow="Shared result"
      title={`${summary.hostname} — AI visibility Grade ${summary.grade}`}
      subtitle={summary.headline}
      breadcrumbs={[{ label: "Home", href: "/" }, { label: "Shared result" }]}
    >
      <section className="space-y-6">
        <ScoreCard hostname={summary.hostname} score={summary.score} bots={summary.bots} />
        <div>
          <Button onClick={() => setShareOpen(true)} data-testid="open-share-dialog">
            <Share2 className="w-4 h-4 mr-2" />
            Share this score
          </Button>
        </div>
      </section>

      <ShareScoreDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        shareToken={token}
        hostname={summary.hostname}
        score={summary.score}
        bots={summary.bots}
      />
    </MarketingPageLayout>
  );
}
