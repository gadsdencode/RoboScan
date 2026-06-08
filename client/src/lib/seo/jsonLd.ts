// client/src/lib/seo/jsonLd.ts
// Dependency-free schema.org builders shared by routes.ts and dynamic.ts.
// Kept import-free (other than types) to avoid cycles between SEO modules.

import { SITE_NAME, SITE_ORIGIN } from "./constants";
import type { JsonLd } from "./types";
import type { BotFaqItem } from "../content/bots";

/** Builds a schema.org FAQPage node from a list of FAQ items. */
export function faqPageJsonLd(faqs: BotFaqItem[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

/** Builds a schema.org WebPage node tied to the site's WebSite entity. */
export function webPageJsonLd(name: string, description: string, url: string): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name,
    description,
    url,
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_ORIGIN,
    },
  };
}
