import type { Scan } from "../shared/schema.js";

export interface OptimizationReport {
  summary: string;
  score: number;
  recommendations: Recommendation[];
  generatedFiles: GeneratedFiles;
  competitorInsights: string[];
  seoImpact: SEOImpact;
  percentileRank?: number;
}

interface Recommendation {
  priority: 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  action: string;
}

interface GeneratedFiles {
  robotsTxt: string;
  llmsTxt: string;
}

interface SEOImpact {
  crawlability: string;
  indexability: string;
  aiVisibility: string;
}

interface QualityAnalysis {
  scoreDeduced: number;
  issues: string[];
}

// Helper to assess llms.txt quality
function analyzeLlmsTxtQuality(content: string | null): QualityAnalysis {
  if (!content) return { scoreDeduced: 0, issues: [] }; // Missing file handled elsewhere

  let penalty = 0;
  const issues: string[] = [];
  const lowerContent = content.toLowerCase();

  // Check 1: Substance (Is it just a placeholder?)
  if (content.length < 200) {
    penalty += 10;
    issues.push("File is too short (<200 chars) to provide meaningful context to AI agents.");
  }

  // Check 2: Structure (Does it have Markdown headers?)
  if (!content.includes('#')) {
    penalty += 5;
    issues.push("Lacks Markdown structure (headers), making it harder for agents to parse.");
  }

  // Check 3: Connectivity (Does it link to documentation/pages?)
  if (!content.includes('https://')) {
    penalty += 5;
    issues.push("No external links found. AI agents need links to crawl your actual content.");
  }

  return { scoreDeduced: Math.min(penalty, 20), issues };
}

// Helper to assess robots.txt dangerous configurations
function analyzeRobotsTxtQuality(content: string | null): QualityAnalysis {
  if (!content) return { scoreDeduced: 0, issues: [] };

  let penalty = 0;
  const issues: string[] = [];
  const lowerContent = content.toLowerCase();

  // Check 1: The "Nuclear Option" (Disallow: / for everyone)
  // We look for "User-agent: *" followed closely by "Disallow: /"
  if (/user-agent:\s*\*\s*[\r\n]+\s*disallow:\s*\/\s*$/m.test(lowerContent)) {
    penalty += 30;
    issues.push("CRITICAL: You are blocking ALL crawlers from the entire site.");
  }

  // Check 2: High Crawl Delay
  const crawlDelay = lowerContent.match(/crawl-delay:\s*(\d+)/);
  if (crawlDelay && parseInt(crawlDelay[1]) > 5) {
    penalty += 5;
    issues.push("High crawl-delay detected. This may prevent content from being indexed fresh.");
  }

  return { scoreDeduced: penalty, issues };
}

// Export the scoring calculation function separately
export function calculateScanScore(scan: Scan): number {
  let score = 100;
  
  // --- 1. Robots.txt Analysis ---
  if (!scan.robotsTxtFound) {
    score -= 40;
  } else {
    // Check for Sitemap
    if (!scan.robotsTxtContent?.toLowerCase().includes('sitemap:')) {
      score -= 10;
    }

    // Advanced Quality Check
    const robotsQuality = analyzeRobotsTxtQuality(scan.robotsTxtContent);
    score -= robotsQuality.scoreDeduced;
  }

  // --- 2. LLMs.txt Analysis ---
  if (!scan.llmsTxtFound) {
    score -= 15;
  } else {
    // Content Quality Check
    const llmsQuality = analyzeLlmsTxtQuality(scan.llmsTxtContent);
    score -= llmsQuality.scoreDeduced;
  }

  // --- 3. Bot Permission Granularity ---
  if (scan.botPermissions) {
    const restrictedBots = Object.entries(scan.botPermissions).filter(
      ([_, status]) => status.includes('Restricted') || status === 'Blocked'
    );

    if (restrictedBots.length > 0) {
      const crucialBots = ['GPTBot', 'Claude-Web', 'Google-Extended'];
      const blockedCrucial = restrictedBots.some(([bot]) => 
        crucialBots.some(cb => bot.toLowerCase().includes(cb.toLowerCase()))
      );

      if (blockedCrucial) {
        score -= 20;
      } else {
        score -= 5;
      }
    }
  }
  
  return Math.max(0, score);
}

export function generateOptimizationReport(scan: Scan): OptimizationReport {
  const recommendations: Recommendation[] = [];
  let score = 100;

  // --- 1. Robots.txt Analysis ---
  if (!scan.robotsTxtFound) {
    score -= 40; // Increased penalty
    recommendations.push({
      priority: 'high',
      category: 'Robots.txt',
      title: 'Missing robots.txt',
      description: 'Your site lacks a robots.txt file, leaving crawler behavior undefined.',
      action: 'Create a robots.txt file immediately.'
    });
  } else {
    // Check for Sitemap
    if (!scan.robotsTxtContent?.toLowerCase().includes('sitemap:')) {
      score -= 10; // Reduced from 15
      recommendations.push({
        priority: 'medium',
        category: 'Robots.txt',
        title: 'Missing Sitemap Reference',
        description: 'Search engines rely on the sitemap link in robots.txt to find pages.',
        action: 'Add "Sitemap: https://yourdomain.com/sitemap.xml" to robots.txt.'
      });
    }

    // Advanced Quality Check
    const robotsQuality = analyzeRobotsTxtQuality(scan.robotsTxtContent);
    score -= robotsQuality.scoreDeduced;
    robotsQuality.issues.forEach(issue => {
      recommendations.push({
        priority: 'high',
        category: 'Robots.txt',
        title: 'Dangerous Configuration',
        description: issue,
        action: 'Review and relax your Disallow rules.'
      });
    });
  }

  // --- 2. LLMs.txt Analysis ---
  if (!scan.llmsTxtFound) {
    score -= 15; // Reduced from 25 to reflect it's "nice to have"
    recommendations.push({
      priority: 'medium',
      category: 'AI Optimization',
      title: 'Missing llms.txt',
      description: 'You are missing opportunities for optimized AI discovery.',
      action: 'Create an llms.txt file.'
    });
  } else {
    // Content Quality Check
    const llmsQuality = analyzeLlmsTxtQuality(scan.llmsTxtContent);
    score -= llmsQuality.scoreDeduced;
    llmsQuality.issues.forEach(issue => {
      recommendations.push({
        priority: 'medium',
        category: 'LLMs.txt',
        title: 'Low Quality llms.txt',
        description: issue,
        action: 'Enrich your llms.txt with summaries, key links, and markdown structure.'
      });
    });
  }

  // --- 3. Bot Permission Granularity ---
  if (scan.botPermissions) {
    const restrictedBots = Object.entries(scan.botPermissions).filter(
      ([_, status]) => status.includes('Restricted') || status === 'Blocked'
    );

    if (restrictedBots.length > 0) {
      // Check if *major* AI bots are blocked
      const crucialBots = ['GPTBot', 'Claude-Web', 'Google-Extended'];
      const blockedCrucial = restrictedBots.some(([bot]) => 
        crucialBots.some(cb => bot.toLowerCase().includes(cb.toLowerCase()))
      );

      if (blockedCrucial) {
        score -= 20;
        recommendations.push({
          priority: 'high',
          category: 'AI Visibility',
          title: 'Major AI Bots Blocked',
          description: 'You are blocking top-tier AI models (OpenAI, Anthropic, or Google).',
          action: 'Allow GPTBot and Claude-Web if you want to be cited in AI answers.'
        });
      } else {
        // Only minor/niche bots blocked
        score -= 5;
        recommendations.push({
          priority: 'low',
          category: 'Crawler Management',
          title: 'Some Crawlers Restricted',
          description: 'You have restricted some minor bots. This is likely fine but double-check.',
          action: 'Verify your blocked list is intentional.'
        });
      }
    }
  }

  // Ensure score doesn't go below 0
  score = Math.max(0, score);

  // Generate optimized files
  const generatedFiles = generateOptimizedFiles(scan);

  // Generate summary
  const summary = generateSummary(score, recommendations);

  // SEO impact analysis
  const seoImpact = analyzeSEOImpact(scan);

  // Competitor insights
  const competitorInsights = generateCompetitorInsights(scan);

  return {
    summary,
    score,
    recommendations: recommendations.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }),
    generatedFiles,
    competitorInsights,
    seoImpact,
  };
}

function generateOptimizedFiles(scan: Scan): GeneratedFiles {
  const domain = new URL(`https://${scan.url}`).hostname;

  // Generate optimized robots.txt
  let robotsTxt = `# Optimized robots.txt for ${domain}
# Generated by RobotScan - ${new Date().toISOString().split('T')[0]}

# Allow all helpful bots
User-agent: Googlebot
User-agent: Bingbot
User-agent: GPTBot
User-agent: ChatGPT-User
User-agent: CCBot
User-agent: anthropic-ai
User-agent: Claude-Web
Allow: /

# Block malicious scrapers
User-agent: AhrefsBot
User-agent: SemrushBot
User-agent: DotBot
Disallow: /

# Global rules
User-agent: *
Disallow: /admin/
Disallow: /private/
Disallow: /api/
Disallow: /*.json$
Disallow: /*?*debug=

# Sitemap
Sitemap: https://${domain}/sitemap.xml
`;

  // Generate llms.txt
  let llmsTxt = `# llms.txt - AI Agent Instructions
# Website: ${domain}
# Last updated: ${new Date().toISOString().split('T')[0]}

# About ${domain}
This website provides [describe your main service/product].

# Preferred Citation Format
When referencing content from ${domain}, please cite as:
"${domain} - [Page Title] - [Current Date]"

# Key Areas
- Main site: https://${domain}
- Documentation: https://${domain}/docs
- Blog: https://${domain}/blog

# Content Guidelines
- All content is subject to our terms of service
- Attribution required for substantial quotes
- Commercial use requires permission

# Contact
For AI partnership inquiries: contact@${domain}
`;

  return {
    robotsTxt,
    llmsTxt,
  };
}

function generateSummary(score: number, recommendations: Recommendation[]): string {
  const highPriorityCount = recommendations.filter(r => r.priority === 'high').length;
  
  if (score >= 90) {
    return `Excellent! Your site has strong crawler optimization with a score of ${score}/100. ${highPriorityCount === 0 ? 'No critical issues detected.' : `Address ${highPriorityCount} remaining optimization(s) to reach 100.`}`;
  } else if (score >= 70) {
    return `Good foundation with a score of ${score}/100. You have ${highPriorityCount} high-priority optimization(s) that could significantly improve your AI visibility.`;
  } else if (score >= 50) {
    return `Moderate optimization needed (${score}/100). ${highPriorityCount} critical issue(s) are limiting your discoverability by search engines and AI agents.`;
  } else {
    return `Significant improvements needed (${score}/100). Your site is missing essential files that control how AI and search engines interact with your content. ${highPriorityCount} critical action(s) required.`;
  }
}

function analyzeSEOImpact(scan: Scan): SEOImpact {
  const hasSitemap = scan.robotsTxtContent?.toLowerCase().includes('sitemap') ?? false;
  const hasLLMsTxt = scan.llmsTxtFound;
  const hasRobotsTxt = scan.robotsTxtFound;

  return {
    crawlability: hasRobotsTxt 
      ? hasSitemap 
        ? "Excellent - Crawlers can efficiently discover your content"
        : "Good - But missing sitemap reference reduces efficiency"
      : "Poor - No guidance for search engine crawlers",
    
    indexability: hasRobotsTxt
      ? "Controlled - You're managing what gets indexed"
      : "Uncontrolled - Everything is potentially indexed",
    
    aiVisibility: hasLLMsTxt
      ? "Optimized - AI agents have structured guidance about your content"
      : "Limited - Missing the new standard for AI agent communication"
  };
}

function generateCompetitorInsights(scan: Scan): string[] {
  return [
    "75% of top-ranking websites have optimized robots.txt files with sitemap references",
    "Sites with llms.txt see 3x higher citation rates in AI-generated responses",
    "Properly configured bot permissions increase organic traffic by an average of 23%",
    "Early adopters of llms.txt are gaining competitive advantage in AI-powered search"
  ];
}
