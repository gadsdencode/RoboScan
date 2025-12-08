import robotsParser from 'robots-parser';

interface ScanResult {
  robotsTxtFound: boolean;
  robotsTxtContent: string | null;
  llmsTxtFound: boolean;
  llmsTxtContent: string | null;
  // 6 additional technical files
  sitemapXmlFound: boolean;
  sitemapXmlContent: string | null;
  securityTxtFound: boolean;
  securityTxtContent: string | null;
  manifestJsonFound: boolean;
  manifestJsonContent: string | null;
  adsTxtFound: boolean;
  adsTxtContent: string | null;
  humansTxtFound: boolean;
  humansTxtContent: string | null;
  aiTxtFound: boolean;
  aiTxtContent: string | null;
  botPermissions: Record<string, string>;
  errors: string[];
  warnings: string[];
}

/**
 * Categorizes and formats fetch errors into user-friendly messages
 */
function categorizeFetchError(error: unknown, url: string): { message: string; isCritical: boolean } {
  if (!(error instanceof Error)) {
    return { message: 'Unknown error occurred', isCritical: true };
  }

  const errorMessage = error.message.toLowerCase();
  const errorName = error.name.toLowerCase();
  const cause = (error as any).cause;

  // Check for DNS resolution errors
  if (
    errorMessage.includes('dns') ||
    errorMessage.includes('enotfound') ||
    errorMessage.includes('getaddrinfo') ||
    errorName.includes('dns') ||
    (cause && (cause.code === 'ENOTFOUND' || cause.code === 'EAI_AGAIN'))
  ) {
    return {
      message: `DNS resolution failed: Unable to resolve the domain name. Please check if the website URL is correct.`,
      isCritical: true,
    };
  }

  // Check for connection timeout errors
  if (
    errorMessage.includes('timeout') ||
    errorMessage.includes('aborted') ||
    errorName.includes('timeout') ||
    errorName.includes('abort') ||
    (cause && (cause.code === 'UND_ERR_CONNECT_TIMEOUT' || cause.code === 'ETIMEDOUT'))
  ) {
    return {
      message: `Connection timeout: The website did not respond within 10 seconds. The server may be down or unreachable.`,
      isCritical: true,
    };
  }

  // Check for connection refused errors
  if (
    errorMessage.includes('refused') ||
    errorMessage.includes('econnrefused') ||
    errorMessage.includes('connection refused') ||
    (cause && cause.code === 'ECONNREFUSED')
  ) {
    return {
      message: `Connection refused: The website server is not accepting connections. The server may be down or blocking requests.`,
      isCritical: true,
    };
  }

  // Check for SSL/TLS certificate errors
  if (
    errorMessage.includes('certificate') ||
    errorMessage.includes('ssl') ||
    errorMessage.includes('tls') ||
    errorMessage.includes('unable to verify') ||
    (cause && (cause.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' || cause.code === 'CERT_HAS_EXPIRED'))
  ) {
    return {
      message: `SSL/TLS certificate error: Unable to establish a secure connection. The website's certificate may be invalid or expired.`,
      isCritical: true,
    };
  }

  // Check for network errors
  if (
    errorMessage.includes('network') ||
    errorMessage.includes('fetch failed') ||
    errorMessage.includes('networkerror') ||
    (cause && cause.code === 'ENETUNREACH')
  ) {
    return {
      message: `Network error: Unable to reach the website. Please check your internet connection and try again.`,
      isCritical: true,
    };
  }

  // Generic error
  return {
    message: `Connection failed: ${error.message}`,
    isCritical: true,
  };
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
      sitemapXmlFound: false,
      sitemapXmlContent: null,
      securityTxtFound: false,
      securityTxtContent: null,
      manifestJsonFound: false,
      manifestJsonContent: null,
      adsTxtFound: false,
      adsTxtContent: null,
      humansTxtFound: false,
      humansTxtContent: null,
      aiTxtFound: false,
      aiTxtContent: null,
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
      signal: AbortSignal.timeout(15000), // Increased timeout for initial connection
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
      // If we get a 4xx or 5xx error, it's not critical - the site exists, we can still scan
      // Only log as warning if it's a server error
      if (initialResponse.status >= 500) {
        warnings.push(`Website returned server error (${initialResponse.status}) but scan will continue`);
      }
    }
  } catch (error) {
    // Categorize the error to determine if it's critical
    const errorInfo = categorizeFetchError(error, normalizedUrl);
    console.error(`[Scanner] Error detecting canonical URL:`, error);
    
    // If it's a critical error (DNS, timeout, connection refused), throw it
    // This will be caught by routes.ts and returned as a proper error response
    if (errorInfo.isCritical) {
      throw new Error(errorInfo.message);
    }
    
    // For non-critical errors, log and continue with original URL
    console.log(`[Scanner] Non-critical error, continuing with original URL: ${canonicalOrigin}`);
    warnings.push(`Could not detect canonical URL: ${errorInfo.message}`);
  }

  // Prepare llms.txt URLs: try canonical path first, then fall back to domain root
  const llmsTxtUrls: string[] = [];
  if (canonicalBasePath && canonicalBasePath !== '') {
    llmsTxtUrls.push(`${canonicalOrigin}${canonicalBasePath}/llms.txt`);
  }
  const rootUrl = `${canonicalOrigin}/llms.txt`;
  if (!llmsTxtUrls.includes(rootUrl)) {
    llmsTxtUrls.push(rootUrl);
  }

  // Define fetch functions for parallel execution
  const fetchRobots = async (): Promise<{
    found: boolean;
    content: string | null;
    botPermissions: Record<string, string>;
    warnings: string[];
    errors: string[];
  }> => {
    const result = {
      found: false,
      content: null as string | null,
      botPermissions: {} as Record<string, string>,
      warnings: [] as string[],
      errors: [] as string[],
    };

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
        result.found = true;
        result.content = await robotsResponse.text();

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
          result.botPermissions[bot] = getBotPermissionStatus(bot, robotsUrl, result.content);
        }

        // Extract user agents from robots.txt to find additional bots
        const userAgentMatches = Array.from(result.content.matchAll(/user-agent:\s*([^\r\n]+)/gi));
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
            result.botPermissions[userAgent] = getBotPermissionStatus(userAgent, robotsUrl, result.content);
          }
        }

        if (!result.content.toLowerCase().includes('sitemap:')) {
          result.warnings.push('robots.txt found but missing sitemap reference');
        }
      } else {
        console.log(`[Scanner] robots.txt not found (status ${robotsResponse.status})`);
      }
    } catch (error) {
      console.error('[Scanner] Error fetching robots.txt:', error);
      const errorInfo = categorizeFetchError(error, `${canonicalOrigin}/robots.txt`);
      // For robots.txt, we don't treat errors as critical since the site might not have one
      result.errors.push(`Failed to fetch robots.txt: ${errorInfo.message}`);
    }

    return result;
  };

  const fetchLlms = async (): Promise<{
    found: boolean;
    content: string | null;
    errors: string[];
  }> => {
    const result = {
      found: false,
      content: null as string | null,
      errors: [] as string[],
    };

    // Try each URL sequentially until one is found
    for (const llmsTxtUrl of llmsTxtUrls) {
      // Skip if we already found it
      if (result.found) break;

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
          result.found = true;
          result.content = await llmsResponse.text();
          console.log(`[Scanner] llms.txt found at ${llmsTxtUrl}`);
        } else {
          console.log(`[Scanner] llms.txt not found at ${llmsTxtUrl} (status ${llmsResponse.status})`);
        }
      } catch (error) {
        console.error(`[Scanner] Error fetching llms.txt from ${llmsTxtUrl}:`, error);
        // Only add error if this was the last URL to try
        if (llmsTxtUrl === llmsTxtUrls[llmsTxtUrls.length - 1] && !result.found) {
          const errorInfo = categorizeFetchError(error, llmsTxtUrl);
          // For llms.txt, we don't treat errors as critical since the site might not have one
          result.errors.push(`Failed to fetch llms.txt: ${errorInfo.message}`);
        }
      }
    }

    return result;
  };

  // Fetch sitemap.xml - typically at /sitemap.xml
  const fetchSitemap = async (): Promise<{
    found: boolean;
    content: string | null;
    errors: string[];
  }> => {
    const result = {
      found: false,
      content: null as string | null,
      errors: [] as string[],
    };

    try {
      const sitemapUrl = `${canonicalOrigin}/sitemap.xml`;
      console.log(`[Scanner] Fetching ${sitemapUrl}`);
      const response = await fetch(sitemapUrl, {
        headers: { 
          'User-Agent': 'RoboscanBot/1.0',
          'Accept': 'application/xml,text/xml,*/*'
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(10000),
      });

      if (response.ok) {
        const content = await response.text();
        // Verify it's actually XML
        if (content.includes('<?xml') || content.includes('<urlset') || content.includes('<sitemapindex')) {
          result.found = true;
          result.content = content;
          console.log(`[Scanner] sitemap.xml found`);
        }
      }
    } catch (error) {
      console.error('[Scanner] Error fetching sitemap.xml:', error);
    }

    return result;
  };

  // Fetch security.txt - per RFC 9116, should be at /.well-known/security.txt (preferred) or /security.txt
  const fetchSecurity = async (): Promise<{
    found: boolean;
    content: string | null;
    errors: string[];
  }> => {
    const result = {
      found: false,
      content: null as string | null,
      errors: [] as string[],
    };

    const securityUrls = [
      `${canonicalOrigin}/.well-known/security.txt`,
      `${canonicalOrigin}/security.txt`
    ];

    for (const url of securityUrls) {
      if (result.found) break;
      try {
        console.log(`[Scanner] Fetching ${url}`);
        const response = await fetch(url, {
          headers: { 
            'User-Agent': 'RoboscanBot/1.0',
            'Accept': 'text/plain,*/*'
          },
          redirect: 'follow',
          signal: AbortSignal.timeout(10000),
        });

        if (response.ok) {
          const content = await response.text();
          // Verify it looks like a security.txt (should have Contact field)
          if (content.toLowerCase().includes('contact:')) {
            result.found = true;
            result.content = content;
            console.log(`[Scanner] security.txt found at ${url}`);
          }
        }
      } catch (error) {
        console.error(`[Scanner] Error fetching security.txt from ${url}:`, error);
      }
    }

    return result;
  };

  // Fetch manifest.json - typically at /manifest.json or /site.webmanifest
  const fetchManifest = async (): Promise<{
    found: boolean;
    content: string | null;
    errors: string[];
  }> => {
    const result = {
      found: false,
      content: null as string | null,
      errors: [] as string[],
    };

    const manifestUrls = [
      `${canonicalOrigin}/manifest.json`,
      `${canonicalOrigin}/site.webmanifest`,
      `${canonicalOrigin}/manifest.webmanifest`
    ];

    for (const url of manifestUrls) {
      if (result.found) break;
      try {
        console.log(`[Scanner] Fetching ${url}`);
        const response = await fetch(url, {
          headers: { 
            'User-Agent': 'RoboscanBot/1.0',
            'Accept': 'application/json,*/*'
          },
          redirect: 'follow',
          signal: AbortSignal.timeout(10000),
        });

        if (response.ok) {
          const content = await response.text();
          // Verify it's valid JSON with manifest-like properties
          try {
            const parsed = JSON.parse(content);
            if (parsed.name || parsed.short_name || parsed.start_url) {
              result.found = true;
              result.content = content;
              console.log(`[Scanner] manifest.json found at ${url}`);
            }
          } catch {
            // Not valid JSON, skip
          }
        }
      } catch (error) {
        console.error(`[Scanner] Error fetching manifest from ${url}:`, error);
      }
    }

    return result;
  };

  // Fetch ads.txt - IAB standard at /ads.txt
  const fetchAds = async (): Promise<{
    found: boolean;
    content: string | null;
    errors: string[];
  }> => {
    const result = {
      found: false,
      content: null as string | null,
      errors: [] as string[],
    };

    try {
      const adsUrl = `${canonicalOrigin}/ads.txt`;
      console.log(`[Scanner] Fetching ${adsUrl}`);
      const response = await fetch(adsUrl, {
        headers: { 
          'User-Agent': 'RoboscanBot/1.0',
          'Accept': 'text/plain,*/*'
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(10000),
      });

      if (response.ok) {
        const content = await response.text();
        // ads.txt should have lines with domain, account-id, relationship format
        if (content.trim().length > 0 && (content.includes(',') || content.includes('#'))) {
          result.found = true;
          result.content = content;
          console.log(`[Scanner] ads.txt found`);
        }
      }
    } catch (error) {
      console.error('[Scanner] Error fetching ads.txt:', error);
    }

    return result;
  };

  // Fetch humans.txt - at /humans.txt
  const fetchHumans = async (): Promise<{
    found: boolean;
    content: string | null;
    errors: string[];
  }> => {
    const result = {
      found: false,
      content: null as string | null,
      errors: [] as string[],
    };

    try {
      const humansUrl = `${canonicalOrigin}/humans.txt`;
      console.log(`[Scanner] Fetching ${humansUrl}`);
      const response = await fetch(humansUrl, {
        headers: { 
          'User-Agent': 'RoboscanBot/1.0',
          'Accept': 'text/plain,*/*'
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(10000),
      });

      if (response.ok) {
        const content = await response.text();
        // humans.txt should have some content
        if (content.trim().length > 10) {
          result.found = true;
          result.content = content;
          console.log(`[Scanner] humans.txt found`);
        }
      }
    } catch (error) {
      console.error('[Scanner] Error fetching humans.txt:', error);
    }

    return result;
  };

  // Fetch ai.txt - emerging standard at /ai.txt
  const fetchAi = async (): Promise<{
    found: boolean;
    content: string | null;
    errors: string[];
  }> => {
    const result = {
      found: false,
      content: null as string | null,
      errors: [] as string[],
    };

    try {
      const aiUrl = `${canonicalOrigin}/ai.txt`;
      console.log(`[Scanner] Fetching ${aiUrl}`);
      const response = await fetch(aiUrl, {
        headers: { 
          'User-Agent': 'RoboscanBot/1.0',
          'Accept': 'text/plain,*/*'
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(10000),
      });

      if (response.ok) {
        const content = await response.text();
        // ai.txt should have content about AI permissions
        if (content.trim().length > 10) {
          result.found = true;
          result.content = content;
          console.log(`[Scanner] ai.txt found`);
        }
      }
    } catch (error) {
      console.error('[Scanner] Error fetching ai.txt:', error);
    }

    return result;
  };

  // Execute all fetches in parallel using Promise.allSettled
  console.log('[Scanner] Executing parallel fetches for all 8 technical files');
  const [
    robotsResult, 
    llmsResult, 
    sitemapResult, 
    securityResult, 
    manifestResult, 
    adsResult, 
    humansResult, 
    aiResult
  ] = await Promise.allSettled([
    fetchRobots(), 
    fetchLlms(), 
    fetchSitemap(), 
    fetchSecurity(), 
    fetchManifest(), 
    fetchAds(), 
    fetchHumans(), 
    fetchAi()
  ]);

  // Process robots.txt results
  let robotsTxtFound = false;
  let robotsTxtContent: string | null = null;
  
  if (robotsResult.status === 'fulfilled') {
    robotsTxtFound = robotsResult.value.found;
    robotsTxtContent = robotsResult.value.content;
    Object.assign(botPermissions, robotsResult.value.botPermissions);
    warnings.push(...robotsResult.value.warnings);
    errors.push(...robotsResult.value.errors);
  } else {
    console.error('[Scanner] robots.txt fetch promise rejected:', robotsResult.reason);
    const errorInfo = categorizeFetchError(robotsResult.reason, `${canonicalOrigin}/robots.txt`);
    errors.push(`Failed to fetch robots.txt: ${errorInfo.message}`);
  }

  // Process llms.txt results
  let llmsTxtFound = false;
  let llmsTxtContent: string | null = null;
  
  if (llmsResult.status === 'fulfilled') {
    llmsTxtFound = llmsResult.value.found;
    llmsTxtContent = llmsResult.value.content;
    errors.push(...llmsResult.value.errors);
  } else {
    console.error('[Scanner] llms.txt fetch promise rejected:', llmsResult.reason);
    const errorInfo = categorizeFetchError(llmsResult.reason, llmsTxtUrls[llmsTxtUrls.length - 1]);
    errors.push(`Failed to fetch llms.txt: ${errorInfo.message}`);
  }

  // Process sitemap.xml results
  let sitemapXmlFound = false;
  let sitemapXmlContent: string | null = null;
  
  if (sitemapResult.status === 'fulfilled') {
    sitemapXmlFound = sitemapResult.value.found;
    sitemapXmlContent = sitemapResult.value.content;
  }

  // Process security.txt results
  let securityTxtFound = false;
  let securityTxtContent: string | null = null;
  
  if (securityResult.status === 'fulfilled') {
    securityTxtFound = securityResult.value.found;
    securityTxtContent = securityResult.value.content;
  }

  // Process manifest.json results
  let manifestJsonFound = false;
  let manifestJsonContent: string | null = null;
  
  if (manifestResult.status === 'fulfilled') {
    manifestJsonFound = manifestResult.value.found;
    manifestJsonContent = manifestResult.value.content;
  }

  // Process ads.txt results
  let adsTxtFound = false;
  let adsTxtContent: string | null = null;
  
  if (adsResult.status === 'fulfilled') {
    adsTxtFound = adsResult.value.found;
    adsTxtContent = adsResult.value.content;
  }

  // Process humans.txt results
  let humansTxtFound = false;
  let humansTxtContent: string | null = null;
  
  if (humansResult.status === 'fulfilled') {
    humansTxtFound = humansResult.value.found;
    humansTxtContent = humansResult.value.content;
  }

  // Process ai.txt results
  let aiTxtFound = false;
  let aiTxtContent: string | null = null;
  
  if (aiResult.status === 'fulfilled') {
    aiTxtFound = aiResult.value.found;
    aiTxtContent = aiResult.value.content;
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
    sitemapXmlFound,
    sitemapXmlContent,
    securityTxtFound,
    securityTxtContent,
    manifestJsonFound,
    manifestJsonContent,
    adsTxtFound,
    adsTxtContent,
    humansTxtFound,
    humansTxtContent,
    aiTxtFound,
    aiTxtContent,
    botPermissions,
    errors,
    warnings,
  };
}
