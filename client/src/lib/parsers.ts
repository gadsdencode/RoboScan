// client/src/lib/parsers.ts
// Smart parsers for robots.txt and llms.txt files

/**
 * Parsed structure for robots.txt form fields
 */
export interface ParsedRobotsTxt {
  sitemapUrl: string;
  crawlDelay: string;
  disallowedPaths: string;
  allowedPaths: string;
  defaultAccess: 'allow-all' | 'block-all' | 'custom';
  // Metadata about what was found
  metadata: {
    hasSitemap: boolean;
    hasCrawlDelay: boolean;
    hasDisallowRules: boolean;
    hasAllowRules: boolean;
    userAgentsFound: string[];
    totalRules: number;
  };
}

/**
 * Parsed structure for llms.txt form fields
 */
export interface ParsedLLMsTxt {
  websiteName: string;
  websiteUrl: string;
  contentDescription: string;
  citationFormat: string;
  allowedBots: string;
  keyAreas: string;
  contentGuidelines: string;
  contactEmail: string;
  // Metadata about what was found
  metadata: {
    hasWebsiteName: boolean;
    hasDescription: boolean;
    hasContactEmail: boolean;
    hasKeyAreas: boolean;
    hasAllowedBots: boolean;
    totalSections: number;
  };
}

/**
 * Parse robots.txt content and extract form-compatible data
 * 
 * Handles standard robots.txt directives:
 * - User-agent: *
 * - Disallow: /path
 * - Allow: /path
 * - Sitemap: https://...
 * - Crawl-delay: N
 */
export function parseRobotsTxt(content: string): ParsedRobotsTxt {
  const lines = content.split(/\r?\n/);
  
  const sitemaps: string[] = [];
  const disallowedPaths: string[] = [];
  const allowedPaths: string[] = [];
  const userAgents: Set<string> = new Set();
  let crawlDelay = '';
  let currentUserAgent = '';
  let isGlobalBlock = false; // For User-agent: * with Disallow: /
  let isGlobalAllow = false; // For User-agent: * with Allow: /
  
  for (const rawLine of lines) {
    const line = rawLine.trim();
    
    // Skip empty lines and comments
    if (!line || line.startsWith('#')) continue;
    
    // Extract directive and value
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;
    
    const directive = line.substring(0, colonIndex).trim().toLowerCase();
    const value = line.substring(colonIndex + 1).trim();
    
    switch (directive) {
      case 'user-agent':
        currentUserAgent = value;
        userAgents.add(value);
        break;
        
      case 'disallow':
        if (value) {
          // Check for global block (Disallow: /)
          if (currentUserAgent === '*' && value === '/') {
            isGlobalBlock = true;
          }
          disallowedPaths.push(value);
        }
        break;
        
      case 'allow':
        if (value) {
          // Check for global allow (Allow: /)
          if (currentUserAgent === '*' && value === '/') {
            isGlobalAllow = true;
          }
          allowedPaths.push(value);
        }
        break;
        
      case 'sitemap':
        if (value) {
          sitemaps.push(value);
        }
        break;
        
      case 'crawl-delay':
        if (value && !isNaN(Number(value))) {
          crawlDelay = value;
        }
        break;
    }
  }
  
  // Determine access policy based on rules
  let defaultAccess: 'allow-all' | 'block-all' | 'custom' = 'custom';
  
  if (isGlobalBlock && !isGlobalAllow && allowedPaths.length === 0) {
    defaultAccess = 'block-all';
  } else if (isGlobalAllow && disallowedPaths.length === 0) {
    defaultAccess = 'allow-all';
  } else if (disallowedPaths.length === 0 && allowedPaths.length === 0) {
    defaultAccess = 'allow-all';
  }
  
  // Filter out the root "/" from paths since it's handled by defaultAccess
  const filteredDisallowed = disallowedPaths.filter(p => p !== '/');
  const filteredAllowed = allowedPaths.filter(p => p !== '/');
  
  return {
    sitemapUrl: sitemaps[0] || '', // Use first sitemap
    crawlDelay,
    disallowedPaths: filteredDisallowed.join('\n'),
    allowedPaths: filteredAllowed.join('\n'),
    defaultAccess,
    metadata: {
      hasSitemap: sitemaps.length > 0,
      hasCrawlDelay: !!crawlDelay,
      hasDisallowRules: filteredDisallowed.length > 0,
      hasAllowRules: filteredAllowed.length > 0,
      userAgentsFound: Array.from(userAgents),
      totalRules: filteredDisallowed.length + filteredAllowed.length,
    },
  };
}

/**
 * Parse llms.txt content and extract form-compatible data
 * 
 * Handles various llms.txt formats:
 * - Structured: # Website: Name (colon-separated key-value headers)
 * - Markdown: # Title and ## Sections
 * - Free-form content with markdown formatting
 */
export function parseLlmsTxt(content: string): ParsedLLMsTxt {
  const lines = content.split(/\r?\n/);
  
  let websiteName = '';
  let websiteUrl = '';
  let contentDescription = '';
  let citationFormat = '';
  let allowedBots = '';
  let keyAreas = '';
  let contentGuidelines = '';
  let contactEmail = '';
  
  // Section mapping for flexible matching
  const sectionMatchers: Record<string, (content: string) => void> = {
    // Description/About sections
    'about': (c) => { if (!contentDescription) contentDescription = c; },
    'description': (c) => { if (!contentDescription) contentDescription = c; },
    'overview': (c) => { if (!contentDescription) contentDescription = c; },
    
    // Key areas/features
    'key areas': (c) => { if (!keyAreas) keyAreas = c; },
    'key features': (c) => { if (!keyAreas) keyAreas = c; },
    'key features & capabilities': (c) => { if (!keyAreas) keyAreas = c; },
    'core services': (c) => { if (!keyAreas) keyAreas = c; },
    'platforms and tools': (c) => { keyAreas += (keyAreas ? '\n\n' : '') + c; },
    
    // Allowed bots
    'allowed bots': (c) => { if (!allowedBots) allowedBots = c; },
    'allowed ai bots': (c) => { if (!allowedBots) allowedBots = c; },
    'bots': (c) => { if (!allowedBots) allowedBots = c; },
    
    // Guidelines
    'content guidelines': (c) => { if (!contentGuidelines) contentGuidelines = c; },
    'guidelines': (c) => { if (!contentGuidelines) contentGuidelines = c; },
    'usage guidelines': (c) => { if (!contentGuidelines) contentGuidelines = c; },
    'key notes for llms, ais, and discovery tools': (c) => { if (!contentGuidelines) contentGuidelines = c; },
    
    // Citation
    'preferred citation format': (c) => { if (!citationFormat) citationFormat = c; },
    'citation format': (c) => { if (!citationFormat) citationFormat = c; },
    'citation': (c) => { if (!citationFormat) citationFormat = c; },
    
    // Contact
    'contact': (c) => { 
      const emailMatch = c.match(/[\w.-]+@[\w.-]+\.\w+/);
      if (emailMatch && !contactEmail) contactEmail = emailMatch[0];
    },
    'contact and partnerships': (c) => {
      const emailMatch = c.match(/[\w.-]+@[\w.-]+\.\w+/);
      if (emailMatch && !contactEmail) contactEmail = emailMatch[0];
    },
  };
  
  let currentSection = '';
  let sectionContent: string[] = [];
  
  // Helper to flush current section to appropriate field
  const flushSection = () => {
    if (!currentSection || sectionContent.length === 0) {
      sectionContent = [];
      return;
    }
    
    // Clean up the content - remove cite markers, clean markdown
    let cleanContent = sectionContent.join('\n').trim();
    cleanContent = cleanContent
      .replace(/\[cite_start\]/g, '')
      .replace(/\[cite:\s*[\d,\s]+\]/g, '')
      .replace(/^\s*>\s*/gm, '') // Remove blockquote markers
      .trim();
    
    const sectionKey = currentSection.toLowerCase();
    
    // Find matching handler
    for (const [pattern, handler] of Object.entries(sectionMatchers)) {
      if (sectionKey === pattern || sectionKey.includes(pattern)) {
        handler(cleanContent);
        break;
      }
    }
    
    sectionContent = [];
  };
  
  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();
    
    // Check for section headers: # Header or ## Header (with or without colon)
    const headerMatch = line.match(/^(#{1,2})\s*(.+?)(?::\s*(.*))?$/);
    
    if (headerMatch) {
      // Flush previous section
      flushSection();
      
      const headerLevel = headerMatch[1].length;
      const headerName = headerMatch[2].trim();
      const headerValue = headerMatch[3]?.trim() || '';
      const lowerHeader = headerName.toLowerCase();
      
      // Handle inline key-value headers like "# Website: MyWebsite"
      if (lowerHeader === 'website' || lowerHeader === 'website name' || lowerHeader === 'site') {
        if (headerValue) websiteName = headerValue;
        currentSection = '';
      } else if (lowerHeader === 'description' && headerValue) {
        contentDescription = headerValue;
        currentSection = '';
      } else if (lowerHeader === 'publisher url' || lowerHeader === 'website url' || lowerHeader === 'url') {
        if (headerValue) websiteUrl = headerValue;
        currentSection = '';
      } else if (lowerHeader.includes('llms.txt')) {
        // Main title - extract website name from it if possible
        if (!websiteName) {
          // Try to extract name from title like "# Overture Systems Solutions - Enterprise AI..."
          const nameMatch = headerName.match(/^([^-–]+)/);
          if (nameMatch) {
            websiteName = nameMatch[1].trim();
          }
        }
        currentSection = '';
      } else {
        // Start collecting content for this section
        currentSection = headerName;
        if (headerValue) {
          sectionContent.push(headerValue);
        }
      }
      continue;
    }
    
    // Collect content for current section
    if (currentSection && line) {
      sectionContent.push(line);
    }
    
    // Also try to extract info from any line (for fallback detection)
    // Extract email
    if (!contactEmail) {
      const emailMatch = line.match(/[\w.-]+@[\w.-]+\.\w+/);
      if (emailMatch) {
        contactEmail = emailMatch[0];
      }
    }
    
    // Extract first meaningful URL as website URL
    if (!websiteUrl) {
      const urlMatch = line.match(/https?:\/\/[^\s\)\]]+/);
      if (urlMatch) {
        const url = urlMatch[0].replace(/[.,;:]+$/, ''); // Remove trailing punctuation
        // Skip file URLs and common non-website URLs
        if (!url.includes('.xml') && !url.includes('.txt') && !url.includes('.md') && !url.includes('linkedin') && !url.includes('twitter') && !url.includes('github')) {
          websiteUrl = url;
        }
      }
    }
  }
  
  // Flush final section
  flushSection();
  
  // Fallback: Try to extract description from first paragraph (after title)
  if (!contentDescription) {
    const firstParagraph = content.match(/(?:^|\n\n)(?:>\s*)?(?:\*\*)?([^#\n][^\n]+)/);
    if (firstParagraph) {
      contentDescription = firstParagraph[1]
        .replace(/\*\*/g, '')
        .replace(/\[cite_start\]/g, '')
        .replace(/\[cite:\s*[\d,\s]+\]/g, '')
        .trim()
        .substring(0, 500); // Limit length
    }
  }
  
  // Final URL fallback
  if (!websiteUrl) {
    const urlMatch = content.match(/https?:\/\/[^\s\)\]]+/);
    if (urlMatch) {
      websiteUrl = urlMatch[0].replace(/[.,;:]+$/, '').replace(/\/+$/, '');
    }
  }
  
  return {
    websiteName,
    websiteUrl,
    contentDescription,
    citationFormat,
    allowedBots,
    keyAreas,
    contentGuidelines,
    contactEmail,
    metadata: {
      hasWebsiteName: !!websiteName,
      hasDescription: !!contentDescription,
      hasContactEmail: !!contactEmail,
      hasKeyAreas: !!keyAreas,
      hasAllowedBots: !!allowedBots,
      totalSections: [
        websiteName,
        contentDescription,
        citationFormat,
        allowedBots,
        keyAreas,
        contentGuidelines,
        contactEmail,
      ].filter(Boolean).length,
    },
  };
}

/**
 * Generate a human-readable summary of parsed robots.txt data
 */
export function summarizeRobotsTxtImport(parsed: ParsedRobotsTxt): string {
  const parts: string[] = [];
  
  if (parsed.metadata.hasSitemap) {
    parts.push('Sitemap URL');
  }
  if (parsed.metadata.hasCrawlDelay) {
    parts.push('Crawl Delay');
  }
  if (parsed.metadata.hasDisallowRules) {
    parts.push(`${parsed.disallowedPaths.split('\n').filter(Boolean).length} Disallow rules`);
  }
  if (parsed.metadata.hasAllowRules) {
    parts.push(`${parsed.allowedPaths.split('\n').filter(Boolean).length} Allow rules`);
  }
  
  if (parts.length === 0) {
    return 'Basic robots.txt structure detected';
  }
  
  return `Found: ${parts.join(', ')}`;
}

/**
 * Generate a human-readable summary of parsed llms.txt data
 */
export function summarizeLlmsTxtImport(parsed: ParsedLLMsTxt): string {
  const parts: string[] = [];
  
  if (parsed.metadata.hasWebsiteName) {
    parts.push('Website Name');
  }
  if (parsed.metadata.hasDescription) {
    parts.push('Description');
  }
  if (parsed.metadata.hasAllowedBots) {
    parts.push('Allowed Bots');
  }
  if (parsed.metadata.hasKeyAreas) {
    parts.push('Key Areas');
  }
  if (parsed.metadata.hasContactEmail) {
    parts.push('Contact Email');
  }
  
  if (parts.length === 0) {
    return 'Basic llms.txt structure detected';
  }
  
  return `Found: ${parts.join(', ')}`;
}
