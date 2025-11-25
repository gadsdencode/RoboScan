// @ts-ignore - psl types are available but not resolved correctly
import psl from 'psl';

export function normalizeDomainForCooldown(url: string): string | null {
  try {
    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = 'https://' + normalizedUrl;
    }

    const parsedUrl = new URL(normalizedUrl);
    
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return null;
    }

    let hostname = parsedUrl.hostname.toLowerCase().replace(/\.$/, '');

    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) || /^\[[\da-f:]+\]$/i.test(hostname)) {
      return hostname;
    }

    if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
      return hostname;
    }

    const parsed = psl.parse(hostname);
    
    if (!parsed.domain) {
      return hostname;
    }

    return parsed.domain;
  } catch (error) {
    return null;
  }
}
