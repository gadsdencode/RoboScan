// client/src/lib/seo/dynamic.ts
// Generates SEO metadata for data-driven pages (bot directory + guides) so that
// titles, descriptions, canonicals, and JSON-LD all derive from the content
// files — never hand-written per page.

import { SITE_NAME } from "./constants";
import { getCanonicalUrl, SEO_ROUTES } from "./routes";
import { faqPageJsonLd, webPageJsonLd } from "./jsonLd";
import type { JsonLd, SeoMetadata } from "./types";
import { BOTS, type BotData } from "../content/bots";
import { GUIDES, type GuideData } from "../content/guides";
import { COMPARISONS, type ComparisonData } from "../content/comparisons";
import { EXAMPLE_GALLERIES, type ExampleGallery } from "../content/robotsExamples";

const BOT_DIRECTORY_PATH = "/bot-directory" as const;

// Re-exported for backwards compatibility with existing imports of dynamic.ts.
export { faqPageJsonLd };

function clamp(text: string, max = 158): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}\u2026`;
}

export function buildBotSeo(bot: BotData): SeoMetadata {
  const canonicalPath = `/bot-directory/${bot.slug}` as const;
  const url = getCanonicalUrl(canonicalPath);
  const title = `${bot.name} (${bot.operator}) — User Agent & How to Allow or Block It`;
  const description = clamp(
    `${bot.purpose} See ${bot.name}'s robots.txt token and copy-paste rules to allow or block it, then check your site for free.`,
  );

  const jsonLd: JsonLd[] = [webPageJsonLd(`${bot.name} — AI Bot Directory`, description, url)];
  if (bot.faqs.length > 0) {
    jsonLd.push(faqPageJsonLd(bot.faqs));
  }

  return { title, description, canonicalPath, jsonLd };
}

export function buildGuideSeo(guide: GuideData): SeoMetadata {
  const canonicalPath = `/guides/${guide.slug}` as const;
  const url = getCanonicalUrl(canonicalPath);
  const title = `${guide.title} | ${SITE_NAME}`;
  const description = clamp(guide.intro);

  const jsonLd: JsonLd[] = [webPageJsonLd(guide.title, description, url)];
  if (guide.faqs.length > 0) {
    jsonLd.push(faqPageJsonLd(guide.faqs));
  }

  return { title, description, canonicalPath, jsonLd };
}

export function buildBotDirectoryIndexSeo(): SeoMetadata {
  const url = getCanonicalUrl(BOT_DIRECTORY_PATH);
  const description = clamp(
    "Browse the major AI crawlers — GPTBot, ClaudeBot, PerplexityBot, Google-Extended, and CCBot. See each bot's user-agent token and robots.txt rules to allow or block it.",
  );
  return {
    title: `AI Bot Directory — User Agents & robots.txt Rules | ${SITE_NAME}`,
    description,
    canonicalPath: BOT_DIRECTORY_PATH,
    jsonLd: [
      webPageJsonLd("AI Bot Directory", description, url),
      {
        "@context": "https://schema.org",
        "@type": "ItemList",
        itemListElement: BOTS.map((bot, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: bot.name,
          url: getCanonicalUrl(`/bot-directory/${bot.slug}`),
        })),
      },
    ],
  };
}

export function buildComparisonSeo(data: ComparisonData): SeoMetadata {
  const canonicalPath = `/compare/${data.slug}` as const;
  const url = getCanonicalUrl(canonicalPath);
  const title = `${data.h1} | ${SITE_NAME}`;
  const description = clamp(data.valueProp);

  const jsonLd: JsonLd[] = [webPageJsonLd(data.h1, description, url)];
  if (data.faqs.length > 0) {
    jsonLd.push(faqPageJsonLd(data.faqs));
  }

  return { title, description, canonicalPath, jsonLd };
}

export function buildExampleGallerySeo(gallery: ExampleGallery): SeoMetadata {
  const canonicalPath = `/examples/${gallery.slug}` as const;
  const url = getCanonicalUrl(canonicalPath);
  const title = `${gallery.h1} | ${SITE_NAME}`;
  const description = clamp(gallery.valueProp);

  const jsonLd: JsonLd[] = [
    webPageJsonLd(gallery.h1, description, url),
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      itemListElement: gallery.examples.map((example, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: example.title,
      })),
    },
  ];
  if (gallery.faqs.length > 0) {
    jsonLd.push(faqPageJsonLd(gallery.faqs));
  }

  return { title, description, canonicalPath, jsonLd };
}

/** All canonical paths owned by the data-driven pages, generated from content. */
export const DYNAMIC_PRERENDER_PATHS: readonly `/${string}`[] = [
  BOT_DIRECTORY_PATH,
  ...BOTS.map((bot) => `/bot-directory/${bot.slug}` as const),
  ...GUIDES.map((guide) => `/guides/${guide.slug}` as const),
  ...COMPARISONS.map((c) => `/compare/${c.slug}` as const),
  ...EXAMPLE_GALLERIES.map((g) => `/examples/${g.slug}` as const),
];

/** Path → metadata for every dynamic page. */
export const DYNAMIC_SEO_BY_PATH: ReadonlyMap<string, SeoMetadata> = new Map<
  string,
  SeoMetadata
>([
  [BOT_DIRECTORY_PATH, buildBotDirectoryIndexSeo()],
  ...BOTS.map(
    (bot) => [`/bot-directory/${bot.slug}`, buildBotSeo(bot)] as const,
  ),
  ...GUIDES.map(
    (guide) => [`/guides/${guide.slug}`, buildGuideSeo(guide)] as const,
  ),
  ...COMPARISONS.map(
    (c) => [`/compare/${c.slug}`, buildComparisonSeo(c)] as const,
  ),
  ...EXAMPLE_GALLERIES.map(
    (g) => [`/examples/${g.slug}`, buildExampleGallerySeo(g)] as const,
  ),
]);

const STATIC_SEO_BY_PATH: ReadonlyMap<string, SeoMetadata> = new Map(
  Object.values(SEO_ROUTES).map((meta) => [meta.canonicalPath, meta]),
);

/** Resolves metadata for any public path (static or dynamic). Used by prerender. */
export function getSeoMetadataByPath(path: string): SeoMetadata | undefined {
  return DYNAMIC_SEO_BY_PATH.get(path) ?? STATIC_SEO_BY_PATH.get(path);
}
