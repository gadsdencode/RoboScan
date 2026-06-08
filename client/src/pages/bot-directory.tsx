// client/src/pages/bot-directory.tsx
import { Link } from "wouter";
import { Bot, Building2, FileCode, ShieldCheck, ExternalLink, ArrowRight } from "lucide-react";
import { MarketingPageLayout } from "@/components/MarketingPageLayout";
import { CodeSnippet, FaqList, TodoBadge } from "@/components/ContentBlocks";
import { getBotBySlug, isTodo } from "@/lib/content/bots";
import { buildBotSeo } from "@/lib/seo/dynamic";
import NotFound from "@/pages/not-found";

interface BotDirectoryPageProps {
  slug: string;
}

interface FactRowProps {
  label: string;
  children: React.ReactNode;
}

function FactRow({ label, children }: FactRowProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-3 border-b border-border last:border-b-0">
      <div className="sm:w-40 shrink-0 text-sm font-medium text-muted-foreground">{label}</div>
      <div className="text-sm text-foreground wrap-break-word min-w-0">{children}</div>
    </div>
  );
}

export default function BotDirectoryPage({ slug }: BotDirectoryPageProps) {
  const bot = getBotBySlug(slug);

  if (!bot) {
    return <NotFound />;
  }

  const relatedBots = bot.relatedSlugs
    .map((relatedSlug) => getBotBySlug(relatedSlug))
    .filter((value): value is NonNullable<typeof value> => Boolean(value));

  return (
    <MarketingPageLayout
      config={buildBotSeo(bot)}
      eyebrow="AI Bot Directory"
      title={bot.name}
      subtitle={bot.purpose}
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "AI Bot Directory", href: "/bot-directory" },
        { label: bot.name },
      ]}
    >
      <section>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          Quick facts
        </h2>
        <div className="rounded-xl border border-border bg-card px-5">
          <FactRow label="Operator">
            <a
              href={bot.operatorUrl}
              className="text-primary hover:underline inline-flex items-center gap-1"
              rel="noopener noreferrer"
              target="_blank"
            >
              <Building2 className="w-3.5 h-3.5" />
              {bot.operator}
            </a>
          </FactRow>
          <FactRow label="Type">
            {bot.isProductToken
              ? "robots.txt product token (not a distinct crawler)"
              : "Web crawler"}
          </FactRow>
          <FactRow label="robots.txt token">
            <code className="font-mono text-primary">{bot.userAgentToken}</code>
          </FactRow>
          <FactRow label="User-Agent string">
            <span className="flex flex-col gap-2">
              <code className="font-mono text-xs text-muted-foreground break-all">
                {bot.fullUserAgentString}
              </code>
              {isTodo(bot.fullUserAgentString) && <TodoBadge />}
            </span>
          </FactRow>
          <FactRow label="Respects robots.txt">
            {bot.respectsRobotsTxt ? "Yes (per operator documentation)" : "No / unconfirmed"}
          </FactRow>
        </div>

        {bot.note && (
          <p className="mt-4 text-sm text-muted-foreground rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex gap-3">
            <ShieldCheck className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <span className="flex flex-col gap-2">
              <span>{bot.note}</span>
              {isTodo(bot.note) && <TodoBadge />}
            </span>
          </p>
        )}
      </section>

      <section>
        <h2 className="text-xl font-bold mb-3">Default behavior</h2>
        <p className="text-muted-foreground leading-relaxed">{bot.defaultBehavior}</p>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <FileCode className="w-5 h-5 text-primary" />
          robots.txt rules
        </h2>
        <div className="grid gap-5">
          <div>
            <h3 className="text-sm font-medium text-foreground mb-2">
              Allow {bot.name}
            </h3>
            <CodeSnippet label="robots.txt" code={bot.allowSnippet} />
          </div>
          <div>
            <h3 className="text-sm font-medium text-foreground mb-2">
              Block {bot.name}
            </h3>
            <CodeSnippet label="robots.txt" code={bot.blockSnippet} />
          </div>
        </div>
      </section>

      {bot.faqs.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-2">Frequently asked questions</h2>
          <FaqList faqs={bot.faqs} />
        </section>
      )}

      {relatedBots.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-4">Related bots</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {relatedBots.map((related) => (
              <Link key={related.slug} href={`/bot-directory/${related.slug}`}>
                <a className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card p-4 hover:border-primary/50 transition-colors group">
                  <span className="flex flex-col">
                    <span className="font-medium">{related.name}</span>
                    <span className="text-xs text-muted-foreground">{related.operator}</span>
                  </span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </a>
              </Link>
            ))}
          </div>
        </section>
      )}

      {bot.docsUrl && (
        <section className="text-sm text-muted-foreground flex flex-wrap items-center gap-2">
          <span>Official documentation:</span>
          {isTodo(bot.docsUrl) ? (
            <span className="flex items-center gap-2">
              <code className="font-mono text-xs">{bot.docsUrl}</code>
              <TodoBadge />
            </span>
          ) : (
            <a
              href={bot.docsUrl}
              className="text-primary hover:underline inline-flex items-center gap-1"
              rel="noopener noreferrer"
              target="_blank"
            >
              {bot.docsUrl}
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </section>
      )}
    </MarketingPageLayout>
  );
}
