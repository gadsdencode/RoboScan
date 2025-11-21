import type { Scan } from "@shared/schema";

export interface ScanDifference {
  type: 'robots_txt' | 'llms_txt' | 'bot_permission' | 'error' | 'warning';
  field: string;
  oldValue: string | null;
  newValue: string | null;
  severity: 'high' | 'medium' | 'low';
  description: string;
}

export interface OptimizationRecommendation {
  category: 'robots_txt' | 'llms_txt' | 'bot_permissions' | 'general';
  severity: 'critical' | 'important' | 'suggestion';
  title: string;
  description: string;
  recommendation: string;
  impact: string;
}

export function compareScanResults(oldScan: Scan, newScan: Scan): ScanDifference[] {
  const differences: ScanDifference[] = [];

  // Compare robots.txt content
  if (oldScan.robotsTxtContent !== newScan.robotsTxtContent) {
    differences.push({
      type: 'robots_txt',
      field: 'robots.txt content',
      oldValue: oldScan.robotsTxtContent,
      newValue: newScan.robotsTxtContent,
      severity: 'high',
      description: 'robots.txt file content has changed'
    });
  }

  // Compare llms.txt content
  if (oldScan.llmsTxtContent !== newScan.llmsTxtContent) {
    differences.push({
      type: 'llms_txt',
      field: 'llms.txt content',
      oldValue: oldScan.llmsTxtContent,
      newValue: newScan.llmsTxtContent,
      severity: 'high',
      description: 'llms.txt file content has changed'
    });
  }

  // Compare bot permissions
  const oldPermissions = (oldScan.botPermissions as Record<string, string>) || {};
  const newPermissions = (newScan.botPermissions as Record<string, string>) || {};
  
  const allBots = new Set([...Object.keys(oldPermissions), ...Object.keys(newPermissions)]);
  
  allBots.forEach(bot => {
    const oldPerm = oldPermissions[bot];
    const newPerm = newPermissions[bot];
    
    if (oldPerm !== newPerm) {
      differences.push({
        type: 'bot_permission',
        field: `${bot} permission`,
        oldValue: oldPerm || 'not set',
        newValue: newPerm || 'removed',
        severity: 'medium',
        description: `Bot permission changed for ${bot}`
      });
    }
  });

  // Compare errors
  const oldErrors = (oldScan.errors as string[]) || [];
  const newErrors = (newScan.errors as string[]) || [];
  
  const newErrorsOnly = newErrors.filter(e => !oldErrors.includes(e));
  const resolvedErrors = oldErrors.filter(e => !newErrors.includes(e));
  
  newErrorsOnly.forEach(error => {
    differences.push({
      type: 'error',
      field: 'errors',
      oldValue: null,
      newValue: error,
      severity: 'high',
      description: `New error detected: ${error}`
    });
  });
  
  resolvedErrors.forEach(error => {
    differences.push({
      type: 'error',
      field: 'errors',
      oldValue: error,
      newValue: null,
      severity: 'low',
      description: `Error resolved: ${error}`
    });
  });

  // Compare warnings
  const oldWarnings = (oldScan.warnings as string[]) || [];
  const newWarnings = (newScan.warnings as string[]) || [];
  
  const newWarningsOnly = newWarnings.filter(w => !oldWarnings.includes(w));
  const resolvedWarnings = oldWarnings.filter(w => !newWarnings.includes(w));
  
  newWarningsOnly.forEach(warning => {
    differences.push({
      type: 'warning',
      field: 'warnings',
      oldValue: null,
      newValue: warning,
      severity: 'medium',
      description: `New warning: ${warning}`
    });
  });
  
  resolvedWarnings.forEach(warning => {
    differences.push({
      type: 'warning',
      field: 'warnings',
      oldValue: warning,
      newValue: null,
      severity: 'low',
      description: `Warning resolved: ${warning}`
    });
  });

  return differences;
}

export function generateOptimizationRecommendations(scan: Scan): OptimizationRecommendation[] {
  const recommendations: OptimizationRecommendation[] = [];

  // Check if robots.txt exists
  if (!scan.robotsTxtFound) {
    recommendations.push({
      category: 'robots_txt',
      severity: 'critical',
      title: 'Missing robots.txt File',
      description: 'Your website does not have a robots.txt file. This file is essential for controlling how search engines and AI bots access your content.',
      recommendation: 'Create a robots.txt file in your website root directory. Start with basic rules like "User-agent: * / Disallow:" to allow all bots, or customize based on your needs.',
      impact: 'Without robots.txt, you have no control over bot crawling behavior, which may lead to unwanted indexing or excessive server load.'
    });
  }

  // Check if llms.txt exists
  if (!scan.llmsTxtFound) {
    recommendations.push({
      category: 'llms_txt',
      severity: 'important',
      title: 'Missing llms.txt File',
      description: 'Your website lacks an llms.txt file. This emerging standard helps AI systems understand how to use your content for training and generation.',
      recommendation: 'Create an llms.txt file to explicitly define permissions for AI/LLM bots. Include sections for allowed usage, attribution requirements, and content restrictions.',
      impact: 'Missing llms.txt means AI systems will follow general robots.txt rules, which may not reflect your AI-specific content preferences.'
    });
  }

  // Analyze robots.txt content
  if (scan.robotsTxtContent) {
    const content = scan.robotsTxtContent.toLowerCase();
    
    // Check for sitemap
    if (!content.includes('sitemap:')) {
      recommendations.push({
        category: 'robots_txt',
        severity: 'important',
        title: 'No Sitemap Reference',
        description: 'Your robots.txt file does not include a sitemap reference.',
        recommendation: 'Add a "Sitemap: https://yoursite.com/sitemap.xml" line to help search engines discover all your pages efficiently.',
        impact: 'Without a sitemap reference, search engines may miss important pages, reducing your site\'s visibility.'
      });
    }

    // Check for crawl-delay
    if (content.includes('crawl-delay:')) {
      const crawlDelayMatch = content.match(/crawl-delay:\s*(\d+)/);
      if (crawlDelayMatch && parseInt(crawlDelayMatch[1]) > 10) {
        recommendations.push({
          category: 'robots_txt',
          severity: 'suggestion',
          title: 'High Crawl Delay',
          description: 'Your robots.txt specifies a crawl delay higher than 10 seconds.',
          recommendation: 'Consider reducing crawl-delay to 1-5 seconds. Modern search engines handle rate limiting automatically, and high delays can slow down indexing.',
          impact: 'Excessive crawl delays may result in slower indexing and reduced search visibility.'
        });
      }
    }

    // Check for blanket disallows
    if (content.includes('disallow: /') && !content.includes('user-agent: googlebot-image')) {
      const lines = content.split('\n');
      let hasBlankDisallow = false;
      let currentUserAgent = '';
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('user-agent:')) {
          currentUserAgent = trimmed.substring(11).trim();
        } else if (trimmed === 'disallow: /' && currentUserAgent === '*') {
          hasBlankDisallow = true;
        }
      }
      
      if (hasBlankDisallow) {
        recommendations.push({
          category: 'robots_txt',
          severity: 'critical',
          title: 'Complete Crawl Blocking',
          description: 'Your robots.txt file blocks all bots from accessing all content with "User-agent: * / Disallow: /"',
          recommendation: 'Unless intentional, remove or modify this rule. If you want to block specific paths, use targeted Disallow rules instead.',
          impact: 'This configuration prevents search engines from indexing your site, making it invisible in search results.'
        });
      }
    }
  }

  // Analyze llms.txt content
  if (scan.llmsTxtContent) {
    const content = scan.llmsTxtContent.toLowerCase();
    
    // Check for basic structure
    if (!content.includes('user-agent:') && !content.includes('disallow:') && !content.includes('allow:')) {
      recommendations.push({
        category: 'llms_txt',
        severity: 'suggestion',
        title: 'Unstructured llms.txt',
        description: 'Your llms.txt file does not follow standard formatting with User-agent and Allow/Disallow directives.',
        recommendation: 'Structure your llms.txt with clear User-agent sections and explicit Allow/Disallow rules for different AI models.',
        impact: 'Poorly structured llms.txt may be ignored by AI systems, reducing your control over AI content usage.'
      });
    }

    // Check for attribution
    if (!content.includes('attribution')) {
      recommendations.push({
        category: 'llms_txt',
        severity: 'suggestion',
        title: 'No Attribution Guidance',
        description: 'Your llms.txt does not specify attribution requirements.',
        recommendation: 'Add an "Attribution:" section to define how AI systems should credit your content when used in training or generation.',
        impact: 'Without attribution guidance, AI systems may use your content without proper credit.'
      });
    }
  }

  // Analyze bot permissions
  const botPermissions = (scan.botPermissions as Record<string, string>) || {};
  const botNames = Object.keys(botPermissions);
  
  // Check for major AI bots
  const majorAIBots = ['gptbot', 'chatgpt-user', 'claude-web', 'cohere-ai', 'anthropic-ai', 'google-extended'];
  const missingBots = majorAIBots.filter(bot => 
    !botNames.some(name => name.toLowerCase().includes(bot.toLowerCase()))
  );
  
  if (missingBots.length > 0 && scan.robotsTxtFound) {
    recommendations.push({
      category: 'bot_permissions',
      severity: 'suggestion',
      title: 'Missing Major AI Bot Rules',
      description: `Your robots.txt does not explicitly define rules for some major AI bots: ${missingBots.join(', ')}`,
      recommendation: 'Add specific User-agent rules for major AI bots to have fine-grained control. Each bot may have different crawling purposes.',
      impact: 'Without explicit rules, these bots will follow your general User-agent: * rules, which may not match your AI content preferences.'
    });
  }

  // Check for conflicting permissions
  const disallowedBots = Object.entries(botPermissions).filter(([_, perm]) => 
    perm.toLowerCase().includes('disallow') || perm.toLowerCase().includes('no')
  );
  
  if (disallowedBots.length > 0 && !scan.llmsTxtFound) {
    recommendations.push({
      category: 'general',
      severity: 'suggestion',
      title: 'AI Restrictions Without llms.txt',
      description: `You're blocking AI bots in robots.txt (${disallowedBots.map(([bot]) => bot).join(', ')}) but don't have an llms.txt file.`,
      recommendation: 'Create an llms.txt file to provide more nuanced AI usage policies. This allows you to differentiate between crawling restrictions and training/generation usage.',
      impact: 'Using only robots.txt for AI restrictions may be too broad and doesn\'t address AI-specific concerns like training data usage.'
    });
  }

  return recommendations;
}

export function getDiffStats(differences: ScanDifference[]) {
  return {
    total: differences.length,
    high: differences.filter(d => d.severity === 'high').length,
    medium: differences.filter(d => d.severity === 'medium').length,
    low: differences.filter(d => d.severity === 'low').length,
    byType: {
      robots_txt: differences.filter(d => d.type === 'robots_txt').length,
      llms_txt: differences.filter(d => d.type === 'llms_txt').length,
      bot_permission: differences.filter(d => d.type === 'bot_permission').length,
      error: differences.filter(d => d.type === 'error').length,
      warning: differences.filter(d => d.type === 'warning').length,
    }
  };
}
