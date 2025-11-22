// Mapping of bot names to their full user agent strings
export const BOT_USER_AGENTS: Record<string, string> = {
  'GPTBot': 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.0; +https://openai.com/gptbot)',
  'ChatGPT-User': 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ChatGPT-User/1.0; +https://openai.com/bot)',
  'CCBot': 'CCBot/2.0 (+https://commoncrawl.org/faq/)',
  'anthropic-ai': 'anthropic-ai',
  'Claude-Web': 'Claude-Web/1.0',
  'Googlebot': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  'Bingbot': 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
  'Slurp': 'Mozilla/5.0 (compatible; Yahoo! Slurp; http://help.yahoo.com/help/us/ysearch/slurp)',
};

// Get user agent string for a bot name
// Falls back to the bot name itself if no specific user agent is defined
export function getBotUserAgent(botName: string): string {
  return BOT_USER_AGENTS[botName] || botName;
}
