// client/src/lib/content/comparisons.ts
// Data for "vs / alternative to" comparison pages. One template renders these.
//
// FAIRNESS POLICY: Competitor cells are either (a) verified from the competitor's
// public site, or (b) a "TODO(verify):" placeholder rendered with a badge. We never
// assert a competitor "lacks" a feature without evidence, and never disparage.

import type { BotFaqItem } from "./bots";

/** A matrix cell: boolean → check/x icon; string → text (TODO(...) → verification badge). */
export type FeatureCell = boolean | string;

export interface FeatureRow {
  feature: string;
  /** AI BotCheck — values verified from this product. */
  us: FeatureCell;
  /** Competitor — verified fact or TODO(verify:) placeholder. */
  them: FeatureCell;
}

export interface AudienceCard {
  heading: string;
  points: string[];
}

export interface ComparisonData {
  slug: string;
  competitorName: string;
  competitorUrl?: string;
  h1: string;
  /** One-line intent-matched value prop. */
  valueProp: string;
  /** Short factual intro paragraphs. */
  intro: string[];
  /** Banner shown above the matrix explaining the verification status. */
  disclaimer: string;
  features: FeatureRow[];
  whoForUs: AudienceCard;
  whoForThem: AudienceCard;
  faqs: BotFaqItem[];
}

export const COMPARISONS: ComparisonData[] = [
  {
    slug: "aibotcheck-vs-botcheck",
    competitorName: "BotCheck",
    competitorUrl: "https://botcheck.app",
    h1: "AI BotCheck vs BotCheck — Feature Comparison",
    valueProp:
      "Both tools scan your site for AI-crawler access. Here's a fair, side-by-side look at how AI BotCheck and BotCheck compare on features and approach.",
    intro: [
      "AI BotCheck and BotCheck (botcheck.app) both let you check whether AI crawlers can access your website. BotCheck focuses on a fast, no-login visibility scan; AI BotCheck adds file builders, a bot reference library, and ongoing monitoring.",
      "The table below marks each competitor detail as verified from BotCheck's public site or as a TODO item pending confirmation — we don't guess at features we can't verify.",
    ],
    disclaimer:
      "Competitor details are based on BotCheck's public homepage (botcheck.app). Cells marked \u201cNeeds verification\u201d could not be confirmed from public information — please verify before publishing. Last reviewed: TODO(verify): add review date.",
    features: [
      // Verified from botcheck.app homepage
      { feature: "Free AI-crawler access scan", us: true, them: true },
      { feature: "No login required to scan", us: true, them: true },
      { feature: "No tracking", us: "TODO(verify): confirm AI BotCheck analytics disclosure", them: true },
      { feature: "Allow + block guidance (be found / block AI)", us: true, them: true },
      // AI BotCheck verified; competitor unconfirmed → TODO (no fabricated "No")
      { feature: "Number of technical files scanned", us: "8 files", them: "TODO(verify): how many files BotCheck scans" },
      {
        feature: "File generators (robots.txt, llms.txt, +6 more)",
        us: "8 builders",
        them: "TODO(verify): does BotCheck offer file generators?",
      },
      { feature: "AI bot directory + crawler guides", us: true, them: "TODO(verify): does BotCheck publish a bot directory?" },
      {
        feature: "Recurring scans + change alerts",
        us: true,
        them: "TODO(verify): does BotCheck offer monitoring?",
      },
      {
        feature: "Premium / paid plan",
        us: "Guardian $29/mo; one-time report $9.99",
        them: "TODO(verify): confirm BotCheck pricing (appears free)",
      },
    ],
    whoForUs: {
      heading: "Choose AI BotCheck if you want to…",
      points: [
        "Generate production-ready robots.txt, llms.txt, and 6 other technical files, not just diagnose access",
        "Monitor changes over time with recurring scans and alerts",
        "Reference per-bot rules via a bot directory and how-to guides",
        "Produce client-ready audits across multiple sites",
      ],
    },
    whoForThem: {
      heading: "BotCheck may be a good fit if you want to…",
      points: [
        "Run a quick, no-login visibility check on a single site",
        "See at a glance whether AI crawlers are allowed or blocked",
        "Avoid creating an account for a one-off look",
      ],
    },
    faqs: [
      {
        question: "Is AI BotCheck an alternative to BotCheck?",
        answer:
          "Yes. Both scan your site for AI-crawler access. AI BotCheck goes further by generating the technical files (robots.txt, llms.txt, and more), monitoring changes over time, and providing a bot directory and guides.",
      },
      {
        question: "Are both tools free?",
        answer:
          "AI BotCheck offers a free scan; advanced file generation and recurring monitoring are part of paid plans (one-time report $9.99 or Guardian $29/mo). BotCheck's homepage advertises a free scan; confirm its current pricing on botcheck.app.",
      },
      {
        question: "Which should I use to block AI crawlers?",
        answer:
          "Either tool can show you which AI bots are currently allowed or blocked. If you also want a ready-to-deploy robots.txt that blocks them, use AI BotCheck's robots.txt generator and examples gallery.",
      },
    ],
  },
];

const COMPARISON_BY_SLUG = new Map(COMPARISONS.map((c) => [c.slug, c]));

export function getComparisonBySlug(slug: string): ComparisonData | undefined {
  return COMPARISON_BY_SLUG.get(slug);
}

export const COMPARISON_SLUGS: readonly string[] = COMPARISONS.map((c) => c.slug);
