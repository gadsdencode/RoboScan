// client/src/lib/content/builderLanding.ts
// Landing-page content that wraps the robots.txt and llms.txt builder tools.
// Drives both the visible sections (BuilderLandingSections) and the FAQPage
// JSON-LD (lib/seo/routes.ts), so on-page FAQ and structured data stay in sync.

import type { BotFaqItem } from "./bots";

export interface BuilderHowToStep {
  title: string;
  description: string;
}

export interface BuilderExample {
  title: string;
  description: string;
  /** File label shown in the code block header (e.g. "robots.txt"). */
  fileLabel: string;
  code: string;
}

export interface BuilderLandingContent {
  /** Intent-matched H1 for the page header. */
  h1: string;
  /** One-line value proposition under the H1. */
  valueProp: string;
  /** Short paragraph(s) answering the search intent, shown below the tool. */
  intro: string[];
  howItWorks: BuilderHowToStep[];
  examples: BuilderExample[];
  faqs: BotFaqItem[];
}

export const ROBOTS_LANDING: BuilderLandingContent = {
  h1: "robots.txt Generator — Control Search & AI Crawlers",
  valueProp:
    "Build a valid robots.txt in minutes: allow or block Googlebot, GPTBot, ClaudeBot, and other AI crawlers, then validate and download — free.",
  intro: [
    "A robots.txt file tells web crawlers which parts of your site they may request. It lives at the root of your domain and is the first thing well-behaved bots check before crawling.",
    "Use the generator above to assemble a syntactically correct file — set a default access policy, fine-tune path rules, declare your sitemap, and validate before you publish.",
  ],
  howItWorks: [
    {
      title: "Choose a default access policy",
      description:
        "Start by allowing all crawlers, blocking all crawlers, or switching to custom rules for fine-grained control.",
    },
    {
      title: "Add path and crawl rules",
      description:
        "List the directories to disallow or allow, and optionally set a crawl-delay to ease load from aggressive bots.",
    },
    {
      title: "Declare your sitemap",
      description:
        "Point crawlers at your sitemap.xml so they can discover every important page on your site.",
    },
    {
      title: "Validate and download",
      description:
        "Check the syntax with one click, then download robots.txt and upload it to your domain's root directory.",
    },
  ],
  examples: [
    {
      title: "Allow every crawler",
      description: "The most permissive baseline — an empty Disallow allows everything.",
      fileLabel: "robots.txt",
      code: ["User-agent: *", "Disallow:"].join("\n"),
    },
    {
      title: "Block AI training crawlers, keep search engines",
      description:
        "AI training tokens are separate from search crawlers, so this stays fully indexable in Google and Bing.",
      fileLabel: "robots.txt",
      code: [
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
      title: "Block a private area for all bots",
      description: "Keep admin and checkout paths out of crawlers while exposing your sitemap.",
      fileLabel: "robots.txt",
      code: [
        "User-agent: *",
        "Disallow: /admin/",
        "Disallow: /cart/",
        "",
        "Sitemap: https://example.com/sitemap.xml",
      ].join("\n"),
    },
  ],
  faqs: [
    {
      question: "Where do I put my robots.txt file?",
      answer:
        "At the root of your domain, served as plain text at https://example.com/robots.txt. Crawlers only look for it there — a file in a subfolder will be ignored.",
    },
    {
      question: "Does robots.txt actually block AI crawlers?",
      answer:
        "robots.txt is a voluntary standard. Reputable AI crawlers like GPTBot and CCBot honor it, but it is not an access-control mechanism. For hard enforcement, add authentication or firewall/WAF rules. See our guide on blocking AI bots for details.",
    },
    {
      question: "Will editing robots.txt hurt my SEO?",
      answer:
        "Only if you disallow pages you want indexed. Blocking AI training tokens such as GPTBot, CCBot, or Google-Extended does not affect Google or Bing search ranking, because those are separate from the search crawlers.",
    },
    {
      question: "What is the difference between Disallow and Allow?",
      answer:
        "Disallow tells a crawler not to request a path; Allow re-permits a more specific path inside a disallowed directory. Rules are matched per user-agent block.",
    },
    {
      question: "Is this robots.txt generator free?",
      answer:
        "Yes. Building, validating, and downloading a robots.txt file is free. Optional premium fields add advanced directives for professional use.",
    },
  ],
};

export const LLMS_LANDING: BuilderLandingContent = {
  h1: "llms.txt Generator — Make Your Site AI-Readable",
  valueProp:
    "Create an llms.txt that tells ChatGPT, Claude, and Perplexity what your site is about, which pages matter, and how to cite you.",
  intro: [
    "llms.txt is an emerging convention for giving large language models a concise, curated map of your site. Where robots.txt controls access, llms.txt offers guidance: which pages matter and how you would like to be cited.",
    "Use the generator above to describe your site, set citation and usage guidance, and list your most important URLs, then validate and publish the file at your domain root.",
  ],
  howItWorks: [
    {
      title: "Describe your site",
      description:
        "Add your site name, URL, and a one-paragraph summary so AI assistants understand what you offer.",
    },
    {
      title: "Set citation and usage guidance",
      description:
        "Specify your preferred citation format and any content guidelines you want AI systems to respect.",
    },
    {
      title: "List key areas and allowed bots",
      description:
        "Point models at your highest-value pages — docs, products, pricing — and note which bots you welcome.",
    },
    {
      title: "Validate and download",
      description:
        "Check the structure, then download llms.txt and place it at the root of your domain.",
    },
  ],
  examples: [
    {
      title: "Minimal llms.txt",
      description: "An H1 site name, a one-line summary, then grouped links to key resources.",
      fileLabel: "llms.txt",
      code: [
        "# Example Co",
        "",
        "> Example Co builds developer tools for AI-ready websites.",
        "",
        "## Docs",
        "- [Getting Started](https://example.com/docs/start): Install and first run",
      ].join("\n"),
    },
    {
      title: "With citation guidance",
      description: "Tell models how you want to be attributed when your content is quoted.",
      fileLabel: "llms.txt",
      code: [
        "## Citation",
        "Cite as: Example Co — [Page Title] — example.com",
        "Attribution is required for substantial quotes.",
      ].join("\n"),
    },
    {
      title: "Declare allowed bots",
      description: "Note the AI agents you welcome alongside your key sections.",
      fileLabel: "llms.txt",
      code: [
        "## Allowed bots",
        "- GPTBot (OpenAI)",
        "- ClaudeBot (Anthropic)",
        "- PerplexityBot (Perplexity)",
      ].join("\n"),
    },
  ],
  faqs: [
    {
      question: "What is llms.txt?",
      answer:
        "llms.txt is a plain-Markdown file that gives large language models a curated map of your site — your most important pages, a short description, and how you would like to be cited.",
    },
    {
      question: "Is llms.txt an official standard?",
      answer:
        "No. It is a community-driven proposal, and adoption varies between AI providers. Treat it as a helpful signal rather than an enforced standard. See our llms.txt setup guide for more.",
    },
    {
      question: "Where does the llms.txt file go?",
      answer:
        "At the root of your domain, served as plain Markdown at https://example.com/llms.txt.",
    },
    {
      question: "Does llms.txt replace robots.txt?",
      answer:
        "No. robots.txt controls whether crawlers may access pages; llms.txt suggests which content matters most and how to use it. They are complementary, not interchangeable.",
    },
    {
      question: "Is this llms.txt generator free?",
      answer:
        "Yes. Building, validating, and downloading an llms.txt file is free. Optional premium fields add richer context such as products, pricing, and brand voice.",
    },
  ],
};
