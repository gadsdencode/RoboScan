import robotsParser from 'robots-parser';

interface ScanResult {
  robotsTxtFound: boolean;
  robotsTxtContent: string | null;
  llmsTxtFound: boolean;
  llmsTxtContent: string | null;
  botPermissions: Record<string, string>;
  errors: string[];
  warnings: string[];
}

function getBotPermissionStatus(
  botName: string, 
  robotsUrl: string, 
  robotsTxtContent: string
): string {
  const robots = robotsParser(robotsUrl, robotsTxtContent);
  
  const testPaths = ['/', '/api', '/admin', '/search', '/content'];
  const allowedPaths: string[] = [];
  const blockedPaths: string[] = [];
  
  for (const path of testPaths) {
    const testUrl = new URL(path, robotsUrl).href;
    if (robots.isAllowed(testUrl, botName)) {
      allowedPaths.push(path);
    } else {
      blockedPaths.push(path);
    }
  }
  
  if (blockedPaths.length === testPaths.length) {
    return 'Blocked';
  }
  
  if (blockedPaths.length > 0) {
    return `Restricted (${blockedPaths.length} of ${testPaths.length} common paths blocked)`;
  }
  
  return 'Allowed';
}

export async function scanWebsite(targetUrl: string): Promise<ScanResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const botPermissions: Record<string, string> = {};

  let normalizedUrl = targetUrl.trim();
  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    normalizedUrl = 'https://' + normalizedUrl;
  }

  try {
    new URL(normalizedUrl);
  } catch {
    errors.push('Invalid URL format');
    return {
      robotsTxtFound: false,
      robotsTxtContent: null,
      llmsTxtFound: false,
      llmsTxtContent: null,
      botPermissions,
      errors,
      warnings,
    };
  }

  const parsedUrl = new URL(normalizedUrl);
  
  // Extract the directory path from the URL, removing trailing slash
  // Examples:
  //   https://example.com/docs -> /docs
  //   https://example.com/docs/ -> /docs
  //   https://example.com/.well-known -> /.well-known
  //   https://example.com -> (empty, root only)
  let basePath = parsedUrl.pathname;
  
  // Normalize: remove trailing slash
  if (basePath.endsWith('/') && basePath !== '/') {
    basePath = basePath.slice(0, -1);
  }
  
  // If basePath is just '/', treat as empty (no subdirectory)
  if (basePath === '/') {
    basePath = '';
  }

  // Detect the canonical URL by making an initial request and following redirects
  // This handles cases where example.com redirects to www.example.com or vice versa
  let canonicalOrigin = parsedUrl.origin;
  let canonicalBasePath = basePath;
  
  try {
    console.log(`[Scanner] Detecting canonical URL for ${normalizedUrl}`);
    const initialResponse = await fetch(normalizedUrl, {
      method: 'GET',
      headers: { 
        'User-Agent': 'RoboscanBot/1.0',
        'Accept': 'text/html,*/*'
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
    });
    
    if (initialResponse.ok) {
      // Use the final URL after redirects as the canonical origin
      const finalUrl = new URL(initialResponse.url);
      canonicalOrigin = finalUrl.origin;
      
      // Also update the base path from the canonical URL
      let finalPath = finalUrl.pathname;
      if (finalPath.endsWith('/') && finalPath !== '/') {
        finalPath = finalPath.slice(0, -1);
      }
      if (finalPath === '/') {
        finalPath = '';
      }
      canonicalBasePath = finalPath;
      
      console.log(`[Scanner] Canonical origin: ${canonicalOrigin}, path: ${canonicalBasePath || '/'}`);
    } else {
      console.log(`[Scanner] Initial request returned ${initialResponse.status}, using original origin`);
    }
  } catch (error) {
    console.log(`[Scanner] Could not detect canonical URL, using original: ${canonicalOrigin}`);
  }

  let robotsTxtFound = false;
  let robotsTxtContent: string | null = null;

  // robots.txt must always be at the domain root per RFC 9309
  try {
    console.log(`[Scanner] Fetching ${canonicalOrigin}/robots.txt`);
    const robotsResponse = await fetch(`${canonicalOrigin}/robots.txt`, {
      headers: { 
        'User-Agent': 'RoboscanBot/1.0',
        'Accept': 'text/plain,*/*'
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
    });

    console.log(`[Scanner] robots.txt response status: ${robotsResponse.status}`);

    if (robotsResponse.ok) {
      robotsTxtFound = true;
      robotsTxtContent = await robotsResponse.text();

      const robotsUrl = `${canonicalOrigin}/robots.txt`;

      // Analyze permissions for key AI bots
      const aiBotsToCheck = [
        'GPTBot',
        'ChatGPT-User',
        'CCBot',
        'anthropic-ai',
        'Claude-Web',
        'Googlebot',
        'Bingbot',
        'Slurp'  // Yahoo
      ];

      for (const bot of aiBotsToCheck) {
        botPermissions[bot] = getBotPermissionStatus(bot, robotsUrl, robotsTxtContent);
      }

      // Extract user agents from robots.txt to find additional bots
      const userAgentMatches = Array.from(robotsTxtContent.matchAll(/user-agent:\s*([^\r\n]+)/gi));
      const foundUserAgents = new Set<string>();
      
      for (const match of userAgentMatches) {
        const userAgent = match[1].trim();
        if (userAgent !== '*' && !aiBotsToCheck.some(b => b.toLowerCase() === userAgent.toLowerCase())) {
          foundUserAgents.add(userAgent);
        }
      }

      // Check additional bots found in the file
      for (const userAgent of Array.from(foundUserAgents)) {
        const lowerUA = userAgent.toLowerCase();
        if (lowerUA.includes('bot') || lowerUA.includes('crawler') || lowerUA.includes('spider')) {
          botPermissions[userAgent] = getBotPermissionStatus(userAgent, robotsUrl, robotsTxtContent);
        }
      }

      if (!robotsTxtContent.toLowerCase().includes('sitemap:')) {
        warnings.push('robots.txt found but missing sitemap reference');
      }
    } else {
      console.log(`[Scanner] robots.txt not found (status ${robotsResponse.status})`);
    }
  } catch (error) {
    console.error('[Scanner] Error fetching robots.txt:', error);
    errors.push(`Failed to fetch robots.txt: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  let llmsTxtFound = false;
  let llmsTxtContent: string | null = null;

  // llms.txt: try canonical path first, then fall back to domain root
  const llmsTxtUrls: string[] = [];
  
  // If there's a canonical path, check there first
  if (canonicalBasePath && canonicalBasePath !== '') {
    llmsTxtUrls.push(`${canonicalOrigin}${canonicalBasePath}/llms.txt`);
  }
  
  // Always also check the domain root as fallback (avoid duplicates)
  const rootUrl = `${canonicalOrigin}/llms.txt`;
  if (!llmsTxtUrls.includes(rootUrl)) {
    llmsTxtUrls.push(rootUrl);
  }

  for (const llmsTxtUrl of llmsTxtUrls) {
    // Skip if we already found it
    if (llmsTxtFound) break;

    try {
      console.log(`[Scanner] Fetching ${llmsTxtUrl}`);
      const llmsResponse = await fetch(llmsTxtUrl, {
        headers: { 
          'User-Agent': 'RoboscanBot/1.0',
          'Accept': 'text/plain,*/*'
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(10000),
      });

      console.log(`[Scanner] llms.txt response status: ${llmsResponse.status}`);

      if (llmsResponse.ok) {
        llmsTxtFound = true;
        llmsTxtContent = await llmsResponse.text();
        console.log(`[Scanner] llms.txt found at ${llmsTxtUrl}`);
      } else {
        console.log(`[Scanner] llms.txt not found at ${llmsTxtUrl} (status ${llmsResponse.status})`);
      }
    } catch (error) {
      console.error(`[Scanner] Error fetching llms.txt from ${llmsTxtUrl}:`, error);
      // Only add error if this was the last URL to try
      if (llmsTxtUrl === llmsTxtUrls[llmsTxtUrls.length - 1] && !llmsTxtFound) {
        errors.push(`Failed to fetch llms.txt: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  // If no robots.txt was found, default to allowed
  if (!robotsTxtFound) {
    botPermissions['GPTBot'] = 'Allowed';
    botPermissions['CCBot'] = 'Allowed';
    botPermissions['anthropic-ai'] = 'Allowed';
  }

  return {
    robotsTxtFound,
    robotsTxtContent,
    llmsTxtFound,
    llmsTxtContent,
    botPermissions,
    errors,
    warnings,
  };
}
