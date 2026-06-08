export type SeoRouteKey =
  | "home"
  | "pricing"
  | "privacy"
  | "terms"
  | "tools/robots-builder"
  | "tools/llms-builder"
  | "tools/sitemap-builder"
  | "tools/security-builder"
  | "tools/manifest-builder"
  | "tools/ads-builder"
  | "tools/humans-builder"
  | "tools/ai-builder";

export type JsonLd = Record<string, unknown>;

export interface SeoMetadata {
  title: string;
  description: string;
  canonicalPath: `/${string}`;
  ogImage?: string;
  ogType?: "website";
  jsonLd?: JsonLd | JsonLd[];
}
