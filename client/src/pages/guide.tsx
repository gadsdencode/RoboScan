// client/src/pages/guide.tsx
import { Link } from "wouter";
import { Info, AlertTriangle, ArrowRight } from "lucide-react";
import { MarketingPageLayout } from "@/components/MarketingPageLayout";
import { CodeSnippet, FaqList } from "@/components/ContentBlocks";
import { getGuideBySlug, type GuideBlock } from "@/lib/content/guides";
import { getBotBySlug } from "@/lib/content/bots";
import { buildGuideSeo } from "@/lib/seo/dynamic";
import NotFound from "@/pages/not-found";

interface GuidePageProps {
  slug: string;
}

function renderBlock(block: GuideBlock, index: number) {
  switch (block.type) {
    case "heading":
      return (
        <h2 key={index} className="text-xl font-bold text-foreground pt-2">
          {block.text}
        </h2>
      );
    case "paragraph":
      return (
        <p key={index} className="text-muted-foreground leading-relaxed">
          {block.text}
        </p>
      );
    case "list":
      return block.ordered ? (
        <ol key={index} className="list-decimal pl-6 space-y-1 text-muted-foreground">
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      ) : (
        <ul key={index} className="list-disc pl-6 space-y-1 text-muted-foreground">
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    case "code":
      return <CodeSnippet key={index} label={block.label} code={block.code} />;
    case "callout":
      return (
        <div
          key={index}
          className={`flex gap-3 rounded-xl border p-4 text-sm ${
            block.tone === "warn"
              ? "border-amber-500/30 bg-amber-500/5 text-amber-200"
              : "border-primary/30 bg-primary/5 text-muted-foreground"
          }`}
        >
          {block.tone === "warn" ? (
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          ) : (
            <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          )}
          <span className="leading-relaxed">{block.text}</span>
        </div>
      );
    default:
      return null;
  }
}

export default function GuidePage({ slug }: GuidePageProps) {
  const guide = getGuideBySlug(slug);

  if (!guide) {
    return <NotFound />;
  }

  const relatedBots = (guide.relatedBotSlugs ?? [])
    .map((botSlug) => getBotBySlug(botSlug))
    .filter((value): value is NonNullable<typeof value> => Boolean(value));

  const relatedGuides = (guide.relatedGuideSlugs ?? [])
    .map((guideSlug) => getGuideBySlug(guideSlug))
    .filter((value): value is NonNullable<typeof value> => Boolean(value));

  return (
    <MarketingPageLayout
      config={buildGuideSeo(guide)}
      eyebrow="Guide"
      title={guide.title}
      subtitle={guide.intro}
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Guides" },
        { label: guide.title },
      ]}
    >
      <article className="space-y-5">{guide.blocks.map(renderBlock)}</article>

      {guide.faqs.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-2">Frequently asked questions</h2>
          <FaqList faqs={guide.faqs} />
        </section>
      )}

      {(relatedBots.length > 0 || relatedGuides.length > 0) && (
        <section>
          <h2 className="text-xl font-bold mb-4">Keep reading</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {relatedGuides.map((related) => (
              <Link key={related.slug} href={`/guides/${related.slug}`}>
                <a className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card p-4 hover:border-primary/50 transition-colors group">
                  <span className="font-medium">{related.title}</span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                </a>
              </Link>
            ))}
            {relatedBots.map((related) => (
              <Link key={related.slug} href={`/bot-directory/${related.slug}`}>
                <a className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card p-4 hover:border-primary/50 transition-colors group">
                  <span className="flex flex-col">
                    <span className="font-medium">{related.name}</span>
                    <span className="text-xs text-muted-foreground">Bot directory</span>
                  </span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                </a>
              </Link>
            ))}
          </div>
        </section>
      )}
    </MarketingPageLayout>
  );
}
