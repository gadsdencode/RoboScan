interface ScanResult {
  robotsTxtFound: boolean;
  robotsTxtContent: string | null;
  llmsTxtFound: boolean;
  llmsTxtContent: string | null;
  botPermissions: Record<string, string>;
  errors: string[];
  warnings: string[];
}

interface BotRules {
  disallows: string[];
  allows: string[];
}

function parseRobotsTxt(content: string): Map<string, BotRules> {
  const rules = new Map<string, BotRules>();
  const lines = content.split('\n');
  let currentUserAgent = '';

  for (const line of lines) {
    const trimmed = line.trim();
    
    if (trimmed.toLowerCase().startsWith('user-agent:')) {
      currentUserAgent = trimmed.substring(11).trim();
      if (!rules.has(currentUserAgent)) {
        rules.set(currentUserAgent, { disallows: [], allows: [] });
      }
    } else if (trimmed.toLowerCase().startsWith('disallow:') && currentUserAgent) {
      const disallowValue = trimmed.substring(9).trim();
      if (disallowValue) {
        rules.get(currentUserAgent)!.disallows.push(disallowValue);
      }
    } else if (trimmed.toLowerCase().startsWith('allow:') && currentUserAgent) {
      const allowValue = trimmed.substring(6).trim();
      if (allowValue) {
        rules.get(currentUserAgent)!.allows.push(allowValue);
      }
    }
  }

  return rules;
}

function getBotPermissionStatus(botName: string, rules: Map<string, BotRules>): string {
  // Check if there are specific rules for this bot
  let botRules = rules.get(botName);
  
  // If no specific rules, fall back to wildcard rules
  if (!botRules || (botRules.disallows.length === 0 && botRules.allows.length === 0)) {
    botRules = rules.get('*');
  }

  if (!botRules) {
    return 'Allowed';
  }

  // Check if completely blocked
  if (botRules.disallows.includes('/')) {
    return 'Blocked';
  }

  // If there are disallow rules but not a complete block
  if (botRules.disallows.length > 0) {
    return `Restricted (${botRules.disallows.length} path${botRules.disallows.length > 1 ? 's' : ''} blocked)`;
  }

  // If only allow rules or no rules
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
  const baseUrl = parsedUrl.origin;
  
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

  let robotsTxtFound = false;
  let robotsTxtContent: string | null = null;

  // robots.txt must always be at the domain root per RFC 9309
  try {
    console.log(`[Scanner] Fetching ${baseUrl}/robots.txt`);
    const robotsResponse = await fetch(`${baseUrl}/robots.txt`, {
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

      // Parse the robots.txt file
      const rules = parseRobotsTxt(robotsTxtContent);

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
        botPermissions[bot] = getBotPermissionStatus(bot, rules);
      }

      // Also check case-insensitive variations that might be in the file
      Array.from(rules.entries()).forEach(([userAgent]) => {
        if (userAgent !== '*' && !aiBotsToCheck.some(b => b.toLowerCase() === userAgent.toLowerCase())) {
          // Include other notable bots found in the file
          const lowerUA = userAgent.toLowerCase();
          if (lowerUA.includes('bot') || lowerUA.includes('crawler') || lowerUA.includes('spider')) {
            botPermissions[userAgent] = getBotPermissionStatus(userAgent, rules);
          }
        }
      });

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

  // llms.txt: try user's provided path first, then fall back to domain root
  const llmsTxtUrls: string[] = [];
  
  // If user provided a path, check there first
  if (basePath && basePath !== '') {
    llmsTxtUrls.push(`${baseUrl}${basePath}/llms.txt`);
  }
  
  // Always also check the domain root as fallback
  llmsTxtUrls.push(`${baseUrl}/llms.txt`);

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
