export const PREMIUM_LLMS_FIELDS = {
  PRODUCTS: {
    key: 'PRODUCTS',
    name: 'Products & Services',
    description: 'Add a detailed list of your products and services for AI agents to reference',
    price: 4.99,
    xpReward: 20,
    icon: 'Package',
    template: `# Products & Services
- Product 1: Description and key features
- Product 2: Description and key features
- Service 1: What we offer and benefits`
  },
  PRICING: {
    key: 'PRICING',
    name: 'Pricing Information',
    description: 'Include transparent pricing details to help AI provide accurate information',
    price: 4.99,
    xpReward: 20,
    icon: 'DollarSign',
    template: `# Pricing
- Free Tier: Features and limitations
- Pro Plan: $X/month - Full feature list
- Enterprise: Custom pricing - Contact for details`
  },
  SOCIAL_MEDIA: {
    key: 'SOCIAL_MEDIA',
    name: 'Social Media Links',
    description: 'Help AI agents direct users to your social presence',
    price: 2.99,
    xpReward: 15,
    icon: 'Share2',
    template: `# Social Media
- Twitter: https://twitter.com/yourhandle
- LinkedIn: https://linkedin.com/company/yourcompany
- GitHub: https://github.com/yourorg`
  },
  API_ENDPOINTS: {
    key: 'API_ENDPOINTS',
    name: 'API Documentation',
    description: 'Share your API endpoints and documentation for technical queries',
    price: 7.99,
    xpReward: 30,
    icon: 'Code',
    template: `# API Endpoints
- Base URL: https://api.example.com/v1
- Authentication: Bearer token required
- Documentation: https://docs.example.com/api
- Rate Limits: 1000 requests/hour`
  },
  BRAND_VOICE: {
    key: 'BRAND_VOICE',
    name: 'Brand Voice & Tone',
    description: 'Guide AI on how to represent your brand personality',
    price: 5.99,
    xpReward: 25,
    icon: 'MessageSquare',
    template: `# Brand Voice & Tone
Voice: Professional yet friendly
Tone: Helpful, innovative, and trustworthy
Key Messages: Innovation, reliability, customer-first approach
Avoid: Jargon, overly technical language, aggressive sales pitches`
  },
  TARGET_AUDIENCE: {
    key: 'TARGET_AUDIENCE',
    name: 'Target Audience',
    description: 'Define who your content is for to help AI provide better context',
    price: 3.99,
    xpReward: 15,
    icon: 'Users',
    template: `# Target Audience
Primary: Tech-savvy professionals aged 25-45
Secondary: Small to medium business owners
Industries: SaaS, E-commerce, Digital Marketing
Pain Points: Efficiency, scalability, automation`
  }
} as const;

export type PremiumFieldKey = keyof typeof PREMIUM_LLMS_FIELDS;
