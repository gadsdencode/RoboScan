import { DEFAULT_OG_IMAGE, SITE_NAME, SITE_ORIGIN } from "./constants";
import { faqPageJsonLd } from "./jsonLd";
import { LLMS_LANDING, ROBOTS_LANDING } from "../content/builderLanding";
import type { JsonLd, SeoMetadata, SeoRouteKey } from "./types";

export function getCanonicalUrl(canonicalPath: string): string {
  const path = canonicalPath.startsWith("/") ? canonicalPath : `/${canonicalPath}`;
  return `${SITE_ORIGIN}${path === "/" ? "/" : path}`;
}

function webApplicationJsonLd(
  name: string,
  description: string,
  url: string,
): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name,
    description,
    url,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };
}

export const SEO_ROUTES: Record<SeoRouteKey, SeoMetadata> = {
  home: {
    title: "AI BotCheck — Check Which AI Bots Can Crawl Your Website",
    description:
      "Scan your website for robots.txt, llms.txt, and six other AI-critical files. See which bots can access your content, audit permissions, and generate production-ready technical files in minutes.",
    canonicalPath: "/",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: SITE_NAME,
        url: SITE_ORIGIN,
        description:
          "Scan your website for robots.txt, llms.txt, and six other AI-critical files. See which bots can access your content, audit permissions, and generate production-ready technical files in minutes.",
      },
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: SITE_NAME,
        url: SITE_ORIGIN,
        logo: DEFAULT_OG_IMAGE,
      },
    ],
  },
  pricing: {
    title: "AI BotCheck Pricing — Free Scans & Premium AI Visibility Reports",
    description:
      "Start free with basic scans and file builders. Upgrade to Guardian for unlimited scans, recurring monitoring, change alerts, full scan history, and premium AI visibility reports.",
    canonicalPath: "/pricing",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Product",
      name: "AI BotCheck Guardian",
      description:
        "Guardian subscription with unlimited scans, recurring monitoring, change alerts, and premium AI visibility reports.",
      url: getCanonicalUrl("/pricing"),
      brand: {
        "@type": "Brand",
        name: SITE_NAME,
      },
      offers: {
        "@type": "Offer",
        price: "29",
        priceCurrency: "USD",
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          price: "29",
          priceCurrency: "USD",
          unitText: "MONTH",
        },
        url: getCanonicalUrl("/pricing"),
      },
    },
  },
  privacy: {
    title: "AI BotCheck Privacy Policy — How We Handle Your Data",
    description:
      "Learn how AI BotCheck collects, uses, stores, and protects account, scan, and subscription data. Covers Stripe payments, Neon database hosting, QStash processing, cookies, and JWT authentication.",
    canonicalPath: "/privacy",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "AI BotCheck Privacy Policy",
      description:
        "Privacy policy for AI BotCheck website scanning and file builder services operated by Overture Systems Solutions, LLC.",
      url: getCanonicalUrl("/privacy"),
      isPartOf: {
        "@type": "WebSite",
        name: SITE_NAME,
        url: SITE_ORIGIN,
      },
    },
  },
  terms: {
    title: "AI BotCheck Terms of Service — Usage Rules & Subscriptions",
    description:
      "Terms governing use of AI BotCheck scans, file builders, and Guardian subscriptions. Covers acceptable use, billing via Stripe, disclaimers, and Virginia governing law.",
    canonicalPath: "/terms",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "AI BotCheck Terms of Service",
      description:
        "Terms of service for AI BotCheck website scanning and file builder services operated by Overture Systems Solutions, LLC.",
      url: getCanonicalUrl("/terms"),
      isPartOf: {
        "@type": "WebSite",
        name: SITE_NAME,
        url: SITE_ORIGIN,
      },
    },
  },
  "tools/robots-builder": {
    title: "Robots.txt AI Crawler Generator — Control GPTBot, ClaudeBot & More",
    description:
      "Generate a production-ready robots.txt that allows or blocks GPTBot, ClaudeBot, Google-Extended, and 50+ AI crawlers. Validate rules and download instantly — free.",
    canonicalPath: "/tools/robots-builder",
    jsonLd: [
      webApplicationJsonLd(
        "Robots.txt AI Crawler Generator",
        "Generate a production-ready robots.txt that allows or blocks GPTBot, ClaudeBot, Google-Extended, and 50+ AI crawlers.",
        getCanonicalUrl("/tools/robots-builder"),
      ),
      faqPageJsonLd(ROBOTS_LANDING.faqs),
    ],
  },
  "tools/llms-builder": {
    title: "llms.txt Generator — Create an AI-Readable Site Guide",
    description:
      "Build an llms.txt file so ChatGPT, Claude, and Perplexity understand your site structure, licensing, and citation preferences. Free generator with built-in validation.",
    canonicalPath: "/tools/llms-builder",
    jsonLd: [
      webApplicationJsonLd(
        "llms.txt Generator",
        "Build an llms.txt file so ChatGPT, Claude, and Perplexity understand your site structure, licensing, and citation preferences.",
        getCanonicalUrl("/tools/llms-builder"),
      ),
      faqPageJsonLd(LLMS_LANDING.faqs),
    ],
  },
  "tools/sitemap-builder": {
    title: "XML Sitemap Generator — Build a Search-Engine-Ready sitemap.xml",
    description:
      "Create a valid sitemap.xml so Google and Bing discover every important page. Set priorities, change frequencies, and download your file instantly.",
    canonicalPath: "/tools/sitemap-builder",
    jsonLd: webApplicationJsonLd(
      "XML Sitemap Generator",
      "Create a valid sitemap.xml so Google and Bing discover every important page.",
      getCanonicalUrl("/tools/sitemap-builder"),
    ),
  },
  "tools/security-builder": {
    title: "security.txt Generator — RFC 9116 Vulnerability Disclosure File",
    description:
      "Generate an RFC 9116 compliant security.txt so security researchers can report vulnerabilities responsibly. Includes contact, encryption key, and policy fields.",
    canonicalPath: "/tools/security-builder",
    jsonLd: webApplicationJsonLd(
      "security.txt Generator",
      "Generate an RFC 9116 compliant security.txt so security researchers can report vulnerabilities responsibly.",
      getCanonicalUrl("/tools/security-builder"),
    ),
  },
  "tools/manifest-builder": {
    title: "manifest.json Generator — Build a PWA Web App Manifest",
    description:
      "Create a W3C-compliant Web App Manifest for installable Progressive Web Apps. Configure icons, theme colors, display mode, and start URL.",
    canonicalPath: "/tools/manifest-builder",
    jsonLd: webApplicationJsonLd(
      "manifest.json Generator",
      "Create a W3C-compliant Web App Manifest for installable Progressive Web Apps.",
      getCanonicalUrl("/tools/manifest-builder"),
    ),
  },
  "tools/ads-builder": {
    title: "ads.txt Generator — IAB-Compliant Authorized Sellers File",
    description:
      "Build an ads.txt file that declares authorized digital sellers and protects your ad inventory from unauthorized resellers and domain spoofing.",
    canonicalPath: "/tools/ads-builder",
    jsonLd: webApplicationJsonLd(
      "ads.txt Generator",
      "Build an ads.txt file that declares authorized digital sellers and protects your ad inventory from unauthorized resellers.",
      getCanonicalUrl("/tools/ads-builder"),
    ),
  },
  "tools/humans-builder": {
    title: "humans.txt Generator — Credit Your Team Behind the Website",
    description:
      "Create a humans.txt file to acknowledge the designers, developers, and collaborators who built your site.",
    canonicalPath: "/tools/humans-builder",
    jsonLd: webApplicationJsonLd(
      "humans.txt Generator",
      "Create a humans.txt file to acknowledge the designers, developers, and collaborators who built your site.",
      getCanonicalUrl("/tools/humans-builder"),
    ),
  },
  "tools/ai-builder": {
    title: "ai.txt Generator — Define How AI Systems Use Your Content",
    description:
      "Generate an ai.txt file specifying training, indexing, and citation rules for AI systems that interact with your website and content.",
    canonicalPath: "/tools/ai-builder",
    jsonLd: webApplicationJsonLd(
      "ai.txt Generator",
      "Generate an ai.txt file specifying training, indexing, and citation rules for AI systems that interact with your website and content.",
      getCanonicalUrl("/tools/ai-builder"),
    ),
  },
};

export function getSeoConfig(route: SeoRouteKey): SeoMetadata {
  return SEO_ROUTES[route];
}
