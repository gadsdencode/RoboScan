// client/src/lib/content/robotsExamples.ts
// Data-driven gallery of copy-paste robots.txt templates for AI crawlers.
// One template renders the array — never hardcode individual examples as JSX.

import type { BotFaqItem } from "./bots";

export interface RobotsExample {
  id: string;
  title: string;
  useCase: string;
  /** File label shown in the code block header. */
  fileLabel: string;
  code: string;
}

export interface ExampleGallery {
  slug: string;
  h1: string;
  valueProp: string;
  intro: string[];
  examples: RobotsExample[];
  faqs: BotFaqItem[];
}

export const EXAMPLE_GALLERIES: ExampleGallery[] = [
  {
    slug: "robots-txt-for-ai",
    h1: "robots.txt for AI — Copy-Paste Templates",
    valueProp:
      "Ready-to-use robots.txt snippets to allow or block AI crawlers like GPTBot, ClaudeBot, PerplexityBot, Google-Extended, and CCBot.",
    intro: [
      "Copy any template below into the robots.txt file at the root of your domain (https://example.com/robots.txt). robots.txt is a voluntary standard — reputable crawlers honor it, but it is not an access-control mechanism.",
      "Not sure what your site currently allows? Run a free scan above, then drop in the template that matches your goal.",
    ],
    examples: [
      {
        id: "allow-all-ai",
        title: "Allow all AI crawlers",
        useCase: "Maximize AI visibility — let every compliant crawler reach your pages.",
        fileLabel: "robots.txt",
        code: ["User-agent: *", "Disallow:"].join("\n"),
      },
      {
        id: "block-all-ai",
        title: "Block the major AI crawlers",
        useCase: "Opt out of AI training and indexing by the best-known AI bots.",
        fileLabel: "robots.txt",
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
        id: "allow-search-block-training",
        title: "Allow search, block AI training",
        useCase:
          "Stay fully indexed in Google and Bing while opting out of generative-AI training crawlers.",
        fileLabel: "robots.txt",
        code: [
          "# Search engines stay allowed by default.",
          "# Block AI training crawlers only:",
          "User-agent: GPTBot",
          "Disallow: /",
          "",
          "User-agent: CCBot",
          "Disallow: /",
          "",
          "User-agent: Google-Extended",
          "Disallow: /",
        ].join("\n"),
      },
      {
        id: "gptbot",
        title: "Block GPTBot (OpenAI)",
        useCase: "Stop OpenAI's training crawler while leaving other bots untouched.",
        fileLabel: "robots.txt",
        code: ["User-agent: GPTBot", "Disallow: /"].join("\n"),
      },
      {
        id: "claudebot",
        title: "Block ClaudeBot (Anthropic)",
        useCase: "Stop Anthropic's training crawler.",
        fileLabel: "robots.txt",
        code: ["User-agent: ClaudeBot", "Disallow: /"].join("\n"),
      },
      {
        id: "perplexitybot",
        title: "Block PerplexityBot (Perplexity)",
        useCase: "Stop Perplexity's crawler from indexing your pages.",
        fileLabel: "robots.txt",
        code: ["User-agent: PerplexityBot", "Disallow: /"].join("\n"),
      },
      {
        id: "google-extended",
        title: "Opt out of Google generative AI (Google-Extended)",
        useCase:
          "Opt out of Gemini/Vertex training without affecting Google Search ranking.",
        fileLabel: "robots.txt",
        code: ["User-agent: Google-Extended", "Disallow: /"].join("\n"),
      },
      {
        id: "ccbot",
        title: "Block CCBot (Common Crawl)",
        useCase:
          "Stop future Common Crawl captures, which many AI trainers reuse downstream.",
        fileLabel: "robots.txt",
        code: ["User-agent: CCBot", "Disallow: /"].join("\n"),
      },
    ],
    faqs: [
      {
        question: "Where do I put these robots.txt rules?",
        answer:
          "In a single robots.txt file at the root of your domain (https://example.com/robots.txt), served as plain text. You can combine multiple blocks in one file.",
      },
      {
        question: "Do these templates guarantee AI bots are blocked?",
        answer:
          "No. robots.txt is a voluntary standard that compliant crawlers honor. For hard enforcement, add authentication or firewall/WAF rules in addition to robots.txt.",
      },
      {
        question: "Will blocking AI crawlers hurt my Google ranking?",
        answer:
          "No. AI training tokens like GPTBot, CCBot, and Google-Extended are separate from search crawlers such as Googlebot, so blocking them does not affect search indexing or ranking.",
      },
    ],
  },
];

const GALLERY_BY_SLUG = new Map(EXAMPLE_GALLERIES.map((g) => [g.slug, g]));

export function getExampleGalleryBySlug(slug: string): ExampleGallery | undefined {
  return GALLERY_BY_SLUG.get(slug);
}

export const EXAMPLE_GALLERY_SLUGS: readonly string[] = EXAMPLE_GALLERIES.map((g) => g.slug);
