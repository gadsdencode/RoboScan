// client/src/pages/compare.tsx
import { CheckCircle, AlertTriangle, ExternalLink } from "lucide-react";
import { MarketingPageLayout } from "@/components/MarketingPageLayout";
import { FaqList, TodoBadge } from "@/components/ContentBlocks";
import { Card, CardContent } from "@/components/ui/card";
import { getComparisonBySlug, type FeatureCell } from "@/lib/content/comparisons";
import { isTodo } from "@/lib/content/bots";
import { buildComparisonSeo } from "@/lib/seo/dynamic";
import NotFound from "@/pages/not-found";

interface ComparePageProps {
  slug: string;
}

function renderCell(cell: FeatureCell) {
  if (typeof cell === "boolean") {
    return cell ? (
      <CheckCircle className="w-5 h-5 text-emerald-500 mx-auto" aria-label="Yes" />
    ) : (
      <span className="text-muted-foreground" aria-label="No">
        —
      </span>
    );
  }
  if (isTodo(cell)) {
    return <TodoBadge />;
  }
  return <span>{cell}</span>;
}

export default function ComparePage({ slug }: ComparePageProps) {
  const data = getComparisonBySlug(slug);

  if (!data) {
    return <NotFound />;
  }

  return (
    <MarketingPageLayout
      config={buildComparisonSeo(data)}
      eyebrow="Comparison"
      title={data.h1}
      subtitle={data.valueProp}
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Compare" },
        { label: `vs ${data.competitorName}` },
      ]}
    >
      <section className="space-y-4 text-muted-foreground leading-relaxed">
        {data.intro.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </section>

      <section>
        <div className="flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-muted-foreground mb-6">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <span>{data.disclaimer}</span>
        </div>

        <h2 className="text-2xl font-bold mb-4">Feature comparison</h2>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-card">
                <th className="text-left font-semibold p-4">Feature</th>
                <th className="text-center font-semibold p-4 text-primary">AI BotCheck</th>
                <th className="text-center font-semibold p-4">{data.competitorName}</th>
              </tr>
            </thead>
            <tbody>
              {data.features.map((row) => (
                <tr key={row.feature} className="border-b border-border last:border-b-0">
                  <td className="p-4 text-foreground">{row.feature}</td>
                  <td className="p-4 text-center">{renderCell(row.us)}</td>
                  <td className="p-4 text-center">{renderCell(row.them)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {data.competitorUrl && (
          <p className="mt-3 text-xs text-muted-foreground flex items-center gap-1">
            Competitor source:
            <a
              href={data.competitorUrl}
              className="text-primary hover:underline inline-flex items-center gap-1"
              rel="noopener noreferrer nofollow"
              target="_blank"
            >
              {data.competitorUrl.replace(/^https?:\/\//, "")}
              <ExternalLink className="w-3 h-3" />
            </a>
          </p>
        )}
      </section>

      <section className="grid sm:grid-cols-2 gap-4">
        {[data.whoForUs, data.whoForThem].map((card) => (
          <Card key={card.heading} className="h-full">
            <CardContent className="p-5">
              <h3 className="font-semibold mb-3">{card.heading}</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {card.points.map((point) => (
                  <li key={point} className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </section>

      {data.faqs.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold mb-2">Frequently asked questions</h2>
          <FaqList faqs={data.faqs} />
        </section>
      )}
    </MarketingPageLayout>
  );
}
