import type { SeoRouteKey } from "./types";
import { DYNAMIC_PRERENDER_PATHS } from "./dynamic";

/** Canonical paths for every public page that should be snapshotted at build time. */
export const SEO_PATH_BY_KEY: Record<SeoRouteKey, `/${string}`> = {
  home: "/",
  pricing: "/pricing",
  privacy: "/privacy",
  terms: "/terms",
  "tools/robots-builder": "/tools/robots-builder",
  "tools/llms-builder": "/tools/llms-builder",
  "tools/sitemap-builder": "/tools/sitemap-builder",
  "tools/security-builder": "/tools/security-builder",
  "tools/manifest-builder": "/tools/manifest-builder",
  "tools/ads-builder": "/tools/ads-builder",
  "tools/humans-builder": "/tools/humans-builder",
  "tools/ai-builder": "/tools/ai-builder",
};

export const PRERENDER_PATHS: readonly `/${string}`[] = [
  ...Object.values(SEO_PATH_BY_KEY),
  ...DYNAMIC_PRERENDER_PATHS,
];

export const SEO_KEY_BY_PATH = new Map<string, SeoRouteKey>(
  Object.entries(SEO_PATH_BY_KEY).map(([key, path]) => [path, key as SeoRouteKey]),
);
