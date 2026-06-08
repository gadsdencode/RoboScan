// client/src/lib/content/bots.ts
// Single source of truth for the AI bot directory.
// Add a new bot by appending an entry here — no new component required.
//
// VERIFICATION POLICY: Values that cannot be confirmed are prefixed with
// "TODO(verify):" so they render with a visible "needs review" badge in the UI.
// Use isTodo() to detect them. Do NOT ship TODO values to production unchecked.

export interface BotFaqItem {
  question: string;
  answer: string;
}

export interface BotData {
  /** URL slug, e.g. "gptbot" → /bot-directory/gptbot */
  slug: string;
  /** Display name, e.g. "GPTBot" */
  name: string;
  /** robots.txt user-agent token used in rules (case-insensitive match). */
  userAgentToken: string;
  /** Full User-Agent request header. TODO(verify:) where the exact/versioned string is unconfirmed. */
  fullUserAgentString: string;
  /** Company/operator behind the crawler. */
  operator: string;
  /** Operator homepage. */
  operatorUrl: string;
  /** One-line summary of why this bot crawls the web. */
  purpose: string;
  /** What happens to a site that takes no action (no robots.txt rule for this bot). */
  defaultBehavior: string;
  /** Whether the operator documents that the bot honors robots.txt. */
  respectsRobotsTxt: boolean;
  /** robots.txt block that ALLOWS this bot. */
  allowSnippet: string;
  /** robots.txt block that BLOCKS this bot. */
  blockSnippet: string;
  /** Frequently asked questions powering the FAQPage JSON-LD. */
  faqs: BotFaqItem[];
  /** Slugs of related bots for internal cross-linking. */
  relatedSlugs: string[];
  /** Official documentation URL. TODO(verify:) where unconfirmed. */
  docsUrl?: string;
  /**
   * True when the identifier is a robots.txt *product token* rather than a
   * distinct crawler with its own User-Agent (e.g. Google-Extended).
   */
  isProductToken?: boolean;
  /** Optional caveats shown as a callout (kept factual; TODO(verify:) where unsure). */
  note?: string;
}

/** Detects unverified placeholder values so the UI can flag them for review. */
export function isTodo(value: string | undefined): boolean {
  return typeof value === "string" && value.includes("TODO(");
}

export const BOTS: BotData[] = [
  {
    slug: "gptbot",
    name: "GPTBot",
    userAgentToken: "GPTBot",
    fullUserAgentString:
      "TODO(verify): exact versioned UA, e.g. Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.x; +https://openai.com/gptbot",
    operator: "OpenAI",
    operatorUrl: "https://openai.com",
    purpose:
      "Crawls publicly available web content that OpenAI may use to help train its foundation models (e.g. the GPT family).",
    defaultBehavior:
      "If you publish no robots.txt rule for GPTBot, OpenAI states it may crawl your publicly accessible pages.",
    respectsRobotsTxt: true,
    allowSnippet: ["User-agent: GPTBot", "Allow: /"].join("\n"),
    blockSnippet: ["User-agent: GPTBot", "Disallow: /"].join("\n"),
    faqs: [
      {
        question: "What is GPTBot?",
        answer:
          "GPTBot is OpenAI's web crawler. It fetches publicly available pages that OpenAI may use to help train its foundation models. It is identified in robots.txt by the user-agent token \u201cGPTBot\u201d.",
      },
      {
        question: "How do I block GPTBot from crawling my site?",
        answer:
          "Add a block for the GPTBot user-agent in your robots.txt:\nUser-agent: GPTBot\nDisallow: /\nOpenAI documents that GPTBot honors robots.txt, so a correct rule prevents future crawling.",
      },
      {
        question: "Does blocking GPTBot affect my Google or Bing ranking?",
        answer:
          "No. GPTBot is OpenAI's training crawler and is separate from search-engine crawlers like Googlebot and Bingbot. Blocking GPTBot does not change how search engines index or rank your site.",
      },
      {
        question: "Is GPTBot the same as the ChatGPT browsing bot?",
        answer:
          "No. GPTBot is the training crawler. OpenAI uses separate identifiers for user-triggered browsing and search. Control each one independently in robots.txt.",
      },
    ],
    relatedSlugs: ["claudebot", "google-extended", "ccbot"],
    docsUrl: "https://platform.openai.com/docs/bots",
  },
  {
    slug: "claudebot",
    name: "ClaudeBot",
    userAgentToken: "ClaudeBot",
    fullUserAgentString:
      "TODO(verify): exact versioned UA, e.g. Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ClaudeBot/1.0; +https://www.anthropic.com/claudebot",
    operator: "Anthropic",
    operatorUrl: "https://www.anthropic.com",
    purpose:
      "Crawls publicly available web content that Anthropic may use to help train its Claude family of models.",
    defaultBehavior:
      "With no robots.txt rule for ClaudeBot, Anthropic states it may crawl your publicly accessible pages.",
    respectsRobotsTxt: true,
    allowSnippet: ["User-agent: ClaudeBot", "Allow: /"].join("\n"),
    blockSnippet: ["User-agent: ClaudeBot", "Disallow: /"].join("\n"),
    faqs: [
      {
        question: "What is ClaudeBot?",
        answer:
          "ClaudeBot is Anthropic's web crawler. It collects publicly available content that Anthropic may use to help train its Claude models. It is identified by the \u201cClaudeBot\u201d user-agent token in robots.txt.",
      },
      {
        question: "How do I block ClaudeBot?",
        answer:
          "Add this to your robots.txt:\nUser-agent: ClaudeBot\nDisallow: /\nAnthropic documents that ClaudeBot honors robots.txt directives.",
      },
      {
        question: "What about the older anthropic-ai and Claude-Web tokens?",
        answer:
          "TODO(verify): Anthropic has historically referenced \u201canthropic-ai\u201d and \u201cClaude-Web\u201d user agents. Confirm which tokens are currently active and add explicit rules for each one you wish to control.",
      },
    ],
    relatedSlugs: ["gptbot", "perplexitybot", "ccbot"],
    docsUrl:
      "TODO(verify): confirm Anthropic's official ClaudeBot documentation URL",
  },
  {
    slug: "perplexitybot",
    name: "PerplexityBot",
    userAgentToken: "PerplexityBot",
    fullUserAgentString:
      "TODO(verify): exact versioned UA, e.g. Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot",
    operator: "Perplexity AI",
    operatorUrl: "https://www.perplexity.ai",
    purpose:
      "Crawls and indexes web pages so they can be surfaced and cited in Perplexity's AI answer engine.",
    defaultBehavior:
      "With no robots.txt rule for PerplexityBot, Perplexity states it may crawl pages to include them in its index.",
    respectsRobotsTxt: true,
    allowSnippet: ["User-agent: PerplexityBot", "Allow: /"].join("\n"),
    blockSnippet: ["User-agent: PerplexityBot", "Disallow: /"].join("\n"),
    note: "TODO(verify): there have been public reports questioning crawler compliance for some Perplexity fetchers. Confirm current behavior and any separate user-triggered fetch user-agent before publishing.",
    faqs: [
      {
        question: "What is PerplexityBot?",
        answer:
          "PerplexityBot is the crawler operated by Perplexity AI. It indexes web pages so they can be retrieved and cited in Perplexity's answer engine. It is identified by the \u201cPerplexityBot\u201d user-agent token.",
      },
      {
        question: "Will blocking PerplexityBot remove me from Perplexity answers?",
        answer:
          "Blocking PerplexityBot prevents it from crawling your pages for indexing. TODO(verify): confirm whether Perplexity uses a separate user-triggered fetch agent that is controlled independently.",
      },
      {
        question: "How do I block PerplexityBot?",
        answer:
          "Add this to robots.txt:\nUser-agent: PerplexityBot\nDisallow: /",
      },
    ],
    relatedSlugs: ["gptbot", "claudebot", "google-extended"],
    docsUrl:
      "TODO(verify): confirm Perplexity's official crawler documentation URL",
  },
  {
    slug: "google-extended",
    name: "Google-Extended",
    userAgentToken: "Google-Extended",
    fullUserAgentString:
      "N/A \u2014 Google-Extended is a robots.txt product token, not a separate crawler. It has no distinct User-Agent header.",
    operator: "Google",
    operatorUrl: "https://www.google.com",
    isProductToken: true,
    purpose:
      "A robots.txt control token that lets sites opt out of having their content used to improve Google's generative AI models (e.g. Gemini / Vertex AI), without affecting Google Search.",
    defaultBehavior:
      "With no Google-Extended rule, Google states your content may be eligible to help improve its generative AI models. It does not change Google Search crawling or ranking.",
    respectsRobotsTxt: true,
    allowSnippet: ["User-agent: Google-Extended", "Allow: /"].join("\n"),
    blockSnippet: ["User-agent: Google-Extended", "Disallow: /"].join("\n"),
    note: "Google-Extended is a product token, not a crawler. Googlebot does the actual crawling; this token only governs generative-AI training use. Disallowing it does NOT affect Google Search indexing or ranking.",
    faqs: [
      {
        question: "What is Google-Extended?",
        answer:
          "Google-Extended is a robots.txt product token, not a crawler with its own User-Agent. It lets publishers control whether their content helps improve Google's generative AI models, such as Gemini, without affecting Google Search.",
      },
      {
        question: "Does disallowing Google-Extended hurt my Google Search ranking?",
        answer:
          "No. Google states that Google-Extended only governs generative-AI training use. Google Search crawling, indexing, and ranking are unaffected because the actual crawling is performed by Googlebot.",
      },
      {
        question: "How do I opt out of Google generative AI training?",
        answer:
          "Add this to robots.txt:\nUser-agent: Google-Extended\nDisallow: /",
      },
    ],
    relatedSlugs: ["gptbot", "claudebot", "ccbot"],
    docsUrl:
      "https://developers.google.com/search/docs/crawling-indexing/overview-google-crawlers",
  },
  {
    slug: "ccbot",
    name: "CCBot",
    userAgentToken: "CCBot",
    fullUserAgentString:
      "TODO(verify): exact versioned UA, e.g. CCBot/2.0 (https://commoncrawl.org/faq/)",
    operator: "Common Crawl",
    operatorUrl: "https://commoncrawl.org",
    purpose:
      "Builds the Common Crawl open dataset \u2014 a large public web archive that many third parties, including AI developers, use as training data.",
    defaultBehavior:
      "With no robots.txt rule for CCBot, your publicly accessible pages may be included in the Common Crawl dataset.",
    respectsRobotsTxt: true,
    allowSnippet: ["User-agent: CCBot", "Allow: /"].join("\n"),
    blockSnippet: ["User-agent: CCBot", "Disallow: /"].join("\n"),
    note: "Blocking CCBot stops new captures in the Common Crawl dataset, but it does not retroactively remove pages already archived in past crawls.",
    faqs: [
      {
        question: "What is CCBot?",
        answer:
          "CCBot is the crawler for Common Crawl, a nonprofit that publishes a free, open archive of the web. The dataset is widely reused, including as AI training data, so blocking CCBot indirectly limits that downstream use.",
      },
      {
        question: "How do I block CCBot?",
        answer:
          "Add this to robots.txt:\nUser-agent: CCBot\nDisallow: /\nCommon Crawl documents that CCBot honors robots.txt.",
      },
      {
        question: "Does blocking CCBot remove my data from past datasets?",
        answer:
          "No. Blocking CCBot prevents future captures, but content already included in earlier Common Crawl snapshots is not retroactively removed.",
      },
    ],
    relatedSlugs: ["gptbot", "claudebot", "google-extended"],
    docsUrl: "https://commoncrawl.org/faq",
  },
];

const BOT_BY_SLUG = new Map(BOTS.map((bot) => [bot.slug, bot]));

export function getBotBySlug(slug: string): BotData | undefined {
  return BOT_BY_SLUG.get(slug);
}

export const BOT_SLUGS: readonly string[] = BOTS.map((bot) => bot.slug);
