// client/src/pages/bot-directory-index.tsx
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { MarketingPageLayout } from "@/components/MarketingPageLayout";
import { BOTS } from "@/lib/content/bots";
import { buildBotDirectoryIndexSeo } from "@/lib/seo/dynamic";

export default function BotDirectoryIndex() {
  return (
    <MarketingPageLayout
      config={buildBotDirectoryIndexSeo()}
      eyebrow="Reference"
      title="AI Bot Directory"
      subtitle="The major AI crawlers and product tokens, with the exact user-agent strings and robots.txt rules you need to allow or block each one."
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "AI Bot Directory" },
      ]}
    >
      <section>
        <div className="grid gap-4 sm:grid-cols-2">
          {BOTS.map((bot) => (
            <Link key={bot.slug} href={`/bot-directory/${bot.slug}`}>
              <a
                className="flex flex-col gap-2 rounded-xl border border-border bg-card p-5 hover:border-primary/50 transition-colors group h-full"
                data-testid={`bot-card-${bot.slug}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-lg">{bot.name}</span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <code className="font-mono text-xs text-primary">{bot.userAgentToken}</code>
                <p className="text-sm text-muted-foreground leading-relaxed">{bot.purpose}</p>
                <span className="text-xs text-muted-foreground mt-auto pt-2">
                  by {bot.operator}
                </span>
              </a>
            </Link>
          ))}
        </div>
      </section>
    </MarketingPageLayout>
  );
}
