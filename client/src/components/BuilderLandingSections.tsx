// client/src/components/BuilderLandingSections.tsx
import { Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { CodeSnippet, FaqList } from "@/components/ContentBlocks";
import type { BuilderLandingContent } from "@/lib/content/builderLanding";

interface BuilderLandingSectionsProps {
  content: BuilderLandingContent;
}

/**
 * Reusable below-the-tool landing content: intro copy, how-it-works steps,
 * examples, and an FAQ. Designed so the other file builders can adopt it later
 * by passing their own BuilderLandingContent. The matching FAQPage JSON-LD is
 * emitted from the SEO config (lib/seo/routes.ts), not here.
 */
export function BuilderLandingSections({ content }: BuilderLandingSectionsProps) {
  return (
    <div className="max-w-3xl mx-auto mt-20 space-y-16">
      {content.intro.length > 0 && (
        <section className="space-y-4 text-muted-foreground leading-relaxed">
          {content.intro.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </section>
      )}

      <section>
        <h2 className="text-2xl font-bold mb-6">How it works</h2>
        <ol className="grid gap-4 sm:grid-cols-2">
          {content.howItWorks.map((step, index) => (
            <li key={step.title}>
              <Card className="h-full">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-bold">
                      {index + 1}
                    </span>
                    <h3 className="font-semibold">{step.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Examples
        </h2>
        <div className="space-y-6">
          {content.examples.map((example) => (
            <div key={example.title}>
              <h3 className="font-semibold mb-1">{example.title}</h3>
              <p className="text-sm text-muted-foreground mb-3">{example.description}</p>
              <CodeSnippet label={example.fileLabel} code={example.code} />
            </div>
          ))}
        </div>
      </section>

      {content.faqs.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold mb-2">Frequently asked questions</h2>
          <FaqList faqs={content.faqs} />
        </section>
      )}
    </div>
  );
}
