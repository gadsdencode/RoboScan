// client/src/pages/examples.tsx
import { MarketingPageLayout } from "@/components/MarketingPageLayout";
import { CodeSnippet, FaqList } from "@/components/ContentBlocks";
import { getExampleGalleryBySlug } from "@/lib/content/robotsExamples";
import { buildExampleGallerySeo } from "@/lib/seo/dynamic";
import NotFound from "@/pages/not-found";

interface ExamplesPageProps {
  slug: string;
}

export default function ExamplesPage({ slug }: ExamplesPageProps) {
  const gallery = getExampleGalleryBySlug(slug);

  if (!gallery) {
    return <NotFound />;
  }

  return (
    <MarketingPageLayout
      config={buildExampleGallerySeo(gallery)}
      eyebrow="Examples"
      title={gallery.h1}
      subtitle={gallery.valueProp}
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Examples" },
        { label: "robots.txt for AI" },
      ]}
    >
      <section className="space-y-4 text-muted-foreground leading-relaxed">
        {gallery.intro.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </section>

      <section className="space-y-8">
        {gallery.examples.map((example) => (
          <div key={example.id} id={example.id}>
            <h2 className="text-xl font-bold mb-1">{example.title}</h2>
            <p className="text-sm text-muted-foreground mb-3">{example.useCase}</p>
            <CodeSnippet label={example.fileLabel} code={example.code} />
          </div>
        ))}
      </section>

      {gallery.faqs.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold mb-2">Frequently asked questions</h2>
          <FaqList faqs={gallery.faqs} />
        </section>
      )}
    </MarketingPageLayout>
  );
}
