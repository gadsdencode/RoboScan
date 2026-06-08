import { Helmet } from "react-helmet-async";
import { DEFAULT_OG_IMAGE, SITE_NAME } from "@/lib/seo/constants";
import { getCanonicalUrl, getSeoConfig } from "@/lib/seo/routes";
import type { SeoMetadata, SeoRouteKey } from "@/lib/seo/types";

type SeoProps =
  | { route: SeoRouteKey; config?: never }
  | { route?: never; config: SeoMetadata };

export function Seo({ route, config: configProp }: SeoProps) {
  const config = configProp ?? getSeoConfig(route as SeoRouteKey);
  const canonicalUrl = getCanonicalUrl(config.canonicalPath);
  const ogImage = config.ogImage ?? DEFAULT_OG_IMAGE;
  const jsonLdBlocks = config.jsonLd
    ? Array.isArray(config.jsonLd)
      ? config.jsonLd
      : [config.jsonLd]
    : [];

  return (
    <Helmet>
      <title>{config.title}</title>
      <meta name="description" content={config.description} />
      <link rel="canonical" href={canonicalUrl} />

      <meta property="og:type" content={config.ogType ?? "website"} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={config.title} />
      <meta property="og:description" content={config.description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={ogImage} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={config.title} />
      <meta name="twitter:description" content={config.description} />
      <meta name="twitter:image" content={ogImage} />

      {jsonLdBlocks.map((block, index) => (
        <script key={index} type="application/ld+json">
          {JSON.stringify(block)}
        </script>
      ))}
    </Helmet>
  );
}
