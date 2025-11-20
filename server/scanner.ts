interface ScanResult {
  robotsTxtFound: boolean;
  robotsTxtContent: string | null;
  llmsTxtFound: boolean;
  llmsTxtContent: string | null;
  botPermissions: Record<string, string>;
  errors: string[];
  warnings: string[];
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

  const baseUrl = new URL(normalizedUrl).origin;

  let robotsTxtFound = false;
  let robotsTxtContent: string | null = null;

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

      const lines = robotsTxtContent.split('\n');
      let currentUserAgent = '';

      for (const line of lines) {
        const trimmed = line.trim();
        
        if (trimmed.toLowerCase().startsWith('user-agent:')) {
          currentUserAgent = trimmed.substring(11).trim();
        } else if (trimmed.toLowerCase().startsWith('disallow:') && currentUserAgent) {
          const disallowValue = trimmed.substring(9).trim();
          
          if (currentUserAgent === '*') {
            if (!botPermissions['GPTBot']) botPermissions['GPTBot'] = disallowValue === '/' ? 'Blocked' : 'Allowed';
            if (!botPermissions['CCBot']) botPermissions['CCBot'] = disallowValue === '/' ? 'Blocked' : 'Allowed';
            if (!botPermissions['Anthropic-AI']) botPermissions['Anthropic-AI'] = disallowValue === '/' ? 'Blocked' : 'Allowed';
          } else {
            botPermissions[currentUserAgent] = disallowValue === '/' ? 'Blocked' : 'Allowed';
          }
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

  try {
    console.log(`[Scanner] Fetching ${baseUrl}/llms.txt`);
    const llmsResponse = await fetch(`${baseUrl}/llms.txt`, {
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
    } else {
      console.log(`[Scanner] llms.txt not found (status ${llmsResponse.status})`);
    }
  } catch (error) {
    console.error('[Scanner] Error fetching llms.txt:', error);
    errors.push(`Failed to fetch llms.txt: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  if (!Object.keys(botPermissions).length) {
    botPermissions['GPTBot'] = 'Allowed';
    botPermissions['CCBot'] = 'Allowed';
    botPermissions['Anthropic-AI'] = 'Allowed';
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
