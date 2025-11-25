export const PREMIUM_ROBOTS_FIELDS = {
  ADVANCED_CRAWL_DELAY: {
    key: 'ADVANCED_CRAWL_DELAY',
    name: 'Advanced Crawl Delay',
    description: 'Set custom crawl delays for different bots to control server load',
    price: 3.99,
    xpReward: 15,
    icon: 'Clock',
    template: `# Advanced Crawl Delay Rules
User-agent: Googlebot
Crawl-delay: 1

User-agent: Bingbot
Crawl-delay: 2`
  },
  SITEMAP_RULES: {
    key: 'SITEMAP_RULES',
    name: 'Multiple Sitemaps',
    description: 'Define multiple sitemaps for better organization and faster indexing',
    price: 4.99,
    xpReward: 20,
    icon: 'Map',
    template: `# Multiple Sitemap Locations
Sitemap: https://example.com/sitemap.xml
Sitemap: https://example.com/sitemap-blog.xml
Sitemap: https://example.com/sitemap-products.xml`
  },
  BOT_SPECIFIC_RULES: {
    key: 'BOT_SPECIFIC_RULES',
    name: 'Bot-Specific Rules',
    description: 'Create customized access rules for different search engines and AI bots',
    price: 5.99,
    xpReward: 25,
    icon: 'Bot',
    template: `# Bot-Specific Access Rules
User-agent: GPTBot
Disallow: /api/
Allow: /docs/

User-agent: ChatGPT-User
Disallow: /private/
Allow: /public/`
  },
  ADVANCED_PATTERNS: {
    key: 'ADVANCED_PATTERNS',
    name: 'Advanced Path Patterns',
    description: 'Use wildcards and advanced patterns for precise crawl control',
    price: 6.99,
    xpReward: 30,
    icon: 'Settings',
    template: `# Advanced Path Patterns
User-agent: *
Disallow: /*?page=
Disallow: /*/private/
Disallow: /*.pdf$
Allow: /public/*.pdf$`
  },
  HOST_DIRECTIVE: {
    key: 'HOST_DIRECTIVE',
    name: 'Host Directive',
    description: 'Specify preferred domain for search engines (useful for www vs non-www)',
    price: 2.99,
    xpReward: 10,
    icon: 'Globe',
    template: `# Preferred Host
Host: https://www.example.com`
  },
  REQUEST_RATE: {
    key: 'REQUEST_RATE',
    name: 'Request Rate Limiting',
    description: 'Control bot request rates to prevent server overload',
    price: 5.99,
    xpReward: 25,
    icon: 'Gauge',
    template: `# Request Rate Limits
User-agent: Googlebot
Request-rate: 1/10

User-agent: *
Request-rate: 1/5`
  }
} as const;

export type PremiumRobotsFieldKey = keyof typeof PREMIUM_ROBOTS_FIELDS;
