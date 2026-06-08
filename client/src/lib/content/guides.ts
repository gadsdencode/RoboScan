// client/src/lib/content/guides.ts
// Single source of truth for crawler guide pages.
// Add a guide by appending an entry here — rendered by the one <GuidePage> template.

import type { BotFaqItem } from "./bots";

/** A renderable content block. Kept as plain data so the prerender pipeline stays simple. */
export type GuideBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered?: boolean; items: string[] }
  | { type: "code"; label?: string; code: string }
  | { type: "callout"; tone: "info" | "warn"; text: string };

export interface GuideData {
  /** URL slug, e.g. "allow-ai-bots" → /guides/allow-ai-bots */
  slug: string;
  /** Page H1. */
  title: string;
  /** Short lede shown under the H1 and reused in the meta description. */
  intro: string;
  /** Ordered content blocks rendered by the template. */
  blocks: GuideBlock[];
  /** FAQs powering the FAQPage JSON-LD. */
  faqs: BotFaqItem[];
  /** Related bot slugs for internal links. */
  relatedBotSlugs?: string[];
  /** Related guide slugs for internal links. */
  relatedGuideSlugs?: string[];
}

export const GUIDES: GuideData[] = [
  {
    slug: "allow-ai-bots",
    title: "How to Allow AI Bots to Crawl Your Website",
    intro:
      "A practical robots.txt guide to letting AI crawlers like GPTBot, ClaudeBot, and PerplexityBot access your content so your pages can be trained on, indexed, and cited.",
    blocks: [
      {
        type: "paragraph",
        text: "Allowing AI crawlers makes your content eligible to appear in AI answers and to be used when models are trained or grounded. If you want visibility in tools like ChatGPT, Claude, and Perplexity, you generally want these bots to reach your pages.",
      },
      {
        type: "heading",
        text: "1. Confirm your robots.txt is reachable",
      },
      {
        type: "paragraph",
        text: "Your file must be served at the root of your domain (https://example.com/robots.txt) as plain text. If it returns a 404 or HTML, crawlers cannot read your rules.",
      },
      {
        type: "heading",
        text: "2. Allow all crawlers (the simplest option)",
      },
      {
        type: "paragraph",
        text: "An empty disallow allows everything. If you have no reason to restrict crawling, this is the most permissive baseline:",
      },
      {
        type: "code",
        label: "robots.txt",
        code: ["User-agent: *", "Disallow:"].join("\n"),
      },
      {
        type: "heading",
        text: "3. Explicitly allow specific AI bots",
      },
      {
        type: "paragraph",
        text: "If you restrict some crawlers but want to invite the major AI bots, list them explicitly. Explicit allow rules also make your intent auditable:",
      },
      {
        type: "code",
        label: "robots.txt",
        code: [
          "User-agent: GPTBot",
          "Allow: /",
          "",
          "User-agent: ClaudeBot",
          "Allow: /",
          "",
          "User-agent: PerplexityBot",
          "Allow: /",
          "",
          "User-agent: Google-Extended",
          "Allow: /",
          "",
          "User-agent: CCBot",
          "Allow: /",
        ].join("\n"),
      },
      {
        type: "callout",
        tone: "info",
        text: "Allowing a bot only grants permission to crawl. Whether a model trains on or cites your page is up to each operator. Pair an allow rule with a clear llms.txt to guide how your content is used.",
      },
      {
        type: "heading",
        text: "4. Verify your rules",
      },
      {
        type: "paragraph",
        text: "After deploying, re-fetch /robots.txt in an incognito window to confirm the live file matches your intent, then run a scan to see which AI bots are currently allowed or blocked.",
      },
    ],
    faqs: [
      {
        question: "Do I need to allow AI bots individually, or is a wildcard enough?",
        answer:
          "A wildcard (User-agent: *) with an empty Disallow allows every compliant crawler, including AI bots. Listing bots individually is only necessary when you want different rules for different crawlers.",
      },
      {
        question: "Does allowing AI bots affect my SEO?",
        answer:
          "Allowing AI training crawlers like GPTBot or CCBot is independent of search engines. Search ranking is governed by crawlers such as Googlebot and Bingbot, which you control with their own rules.",
      },
      {
        question: "If I allow a bot, will it definitely cite my content?",
        answer:
          "No. An allow rule only permits crawling. Whether and how a model uses or cites your content is determined by each operator's own policies.",
      },
    ],
    relatedBotSlugs: ["gptbot", "claudebot", "perplexitybot"],
    relatedGuideSlugs: ["block-ai-bots", "llms-txt-setup"],
  },
  {
    slug: "block-ai-bots",
    title: "How to Block AI Bots From Crawling Your Website",
    intro:
      "Step-by-step robots.txt rules to stop AI crawlers like GPTBot, ClaudeBot, CCBot, and Google-Extended from accessing your content for training or indexing.",
    blocks: [
      {
        type: "paragraph",
        text: "If you would rather keep your content out of AI training datasets and answer engines, you can disallow the relevant crawlers in robots.txt. Compliant bots honor these rules on their next crawl.",
      },
      {
        type: "callout",
        tone: "warn",
        text: "robots.txt is a voluntary standard. Reputable operators honor it, but it is not an access-control mechanism. For hard enforcement, use authentication, IP/user-agent firewall rules, or WAF blocking in addition to robots.txt.",
      },
      {
        type: "heading",
        text: "1. Block the major AI crawlers",
      },
      {
        type: "paragraph",
        text: "Add an explicit disallow for each AI bot you want to exclude:",
      },
      {
        type: "code",
        label: "robots.txt",
        code: [
          "User-agent: GPTBot",
          "Disallow: /",
          "",
          "User-agent: ClaudeBot",
          "Disallow: /",
          "",
          "User-agent: PerplexityBot",
          "Disallow: /",
          "",
          "User-agent: Google-Extended",
          "Disallow: /",
          "",
          "User-agent: CCBot",
          "Disallow: /",
        ].join("\n"),
      },
      {
        type: "heading",
        text: "2. Keep search engines while blocking AI training",
      },
      {
        type: "paragraph",
        text: "Because AI training tokens are separate from search crawlers, you can block AI training while staying fully indexed in Google and Bing. Google-Extended is the key token here: disallowing it opts you out of Google's generative-AI training without affecting Search.",
      },
      {
        type: "callout",
        tone: "info",
        text: "Blocking CCBot stops future Common Crawl captures, but pages already in past Common Crawl snapshots are not removed retroactively.",
      },
      {
        type: "heading",
        text: "3. Verify the block took effect",
      },
      {
        type: "paragraph",
        text: "Deploy the file, re-fetch /robots.txt to confirm it is live, then scan your site to confirm each AI bot now reads as blocked.",
      },
    ],
    faqs: [
      {
        question: "Does robots.txt guarantee AI bots cannot access my site?",
        answer:
          "No. robots.txt is a voluntary directive. Well-behaved crawlers respect it, but it does not technically prevent access. Use authentication or firewall/WAF rules for enforcement.",
      },
      {
        question: "Can I block AI training but keep showing up in Google Search?",
        answer:
          "Yes. AI training tokens such as GPTBot, CCBot, and Google-Extended are separate from search crawlers like Googlebot. Blocking them does not remove you from Google Search.",
      },
      {
        question: "Will blocking AI bots delete content already used for training?",
        answer:
          "Generally no. A robots.txt block prevents future crawling. Content already collected in prior crawls or datasets is not automatically removed.",
      },
    ],
    relatedBotSlugs: ["gptbot", "ccbot", "google-extended"],
    relatedGuideSlugs: ["allow-ai-bots", "llms-txt-setup"],
  },
  {
    slug: "llms-txt-setup",
    title: "How to Set Up an llms.txt File",
    intro:
      "A beginner-friendly guide to creating an llms.txt file so AI assistants can find, understand, and correctly cite the most important pages on your site.",
    blocks: [
      {
        type: "paragraph",
        text: "llms.txt is an emerging convention for giving large language models a concise, curated map of your site. Where robots.txt controls access, llms.txt offers guidance: which pages matter, how to describe them, and how you would like to be cited.",
      },
      {
        type: "callout",
        tone: "info",
        text: "llms.txt is a community proposal, not a formal standard. Support varies by AI provider, so treat it as a helpful signal rather than a guaranteed control.",
      },
      {
        type: "heading",
        text: "1. Create the file at your site root",
      },
      {
        type: "paragraph",
        text: "Place a Markdown file at https://example.com/llms.txt. It is plain Markdown, so it is readable by both humans and models.",
      },
      {
        type: "heading",
        text: "2. Use the conventional structure",
      },
      {
        type: "paragraph",
        text: "Start with an H1 for your site name, an optional blockquote summary, then grouped links to your key resources:",
      },
      {
        type: "code",
        label: "llms.txt",
        code: [
          "# Example Co",
          "",
          "> Example Co builds developer tools for AI-ready websites.",
          "",
          "## Docs",
          "- [Getting Started](https://example.com/docs/start): Install and first run",
          "- [API Reference](https://example.com/docs/api): Full endpoint reference",
          "",
          "## Policies",
          "- [Citation Policy](https://example.com/citation): How to cite us",
        ].join("\n"),
      },
      {
        type: "heading",
        text: "3. Link only your highest-value pages",
      },
      {
        type: "list",
        items: [
          "Core product or service pages",
          "Documentation and how-to content",
          "Authoritative reference and pricing pages",
          "Your citation, licensing, or contact policy",
        ],
      },
      {
        type: "heading",
        text: "4. Keep it current",
      },
      {
        type: "paragraph",
        text: "Review llms.txt whenever your site structure changes. Stale links reduce trust and can lead models to cite outdated pages.",
      },
    ],
    faqs: [
      {
        question: "Is llms.txt an official standard?",
        answer:
          "No. llms.txt is a community-driven proposal. Adoption differs between AI providers, so it should be treated as guidance rather than an enforced standard.",
      },
      {
        question: "Where does llms.txt go?",
        answer:
          "At the root of your domain, served as plain Markdown text at https://example.com/llms.txt.",
      },
      {
        question: "Does llms.txt replace robots.txt?",
        answer:
          "No. robots.txt controls whether crawlers may access pages; llms.txt suggests which content is most important and how to use it. They are complementary.",
      },
    ],
    relatedBotSlugs: ["gptbot", "claudebot", "perplexitybot"],
    relatedGuideSlugs: ["allow-ai-bots", "block-ai-bots"],
  },
];

const GUIDE_BY_SLUG = new Map(GUIDES.map((guide) => [guide.slug, guide]));

export function getGuideBySlug(slug: string): GuideData | undefined {
  return GUIDE_BY_SLUG.get(slug);
}

export const GUIDE_SLUGS: readonly string[] = GUIDES.map((guide) => guide.slug);
