// shared/publicScanSummary.ts
// Allowlisted, non-sensitive projection of a scan for the PUBLIC share view.
// toPublicScanSummary() is the single chokepoint that decides what becomes public —
// it intentionally omits userId, raw file contents, errors/warnings, tags, and any
// premium-report data.

import type { Scan } from "./schema";
import { scoreToGrade, type ScoreGrade } from "./scoreGrade";

export type BotShareStatus = "allow" | "block" | "mixed" | "unknown";

export interface BotSummary {
  name: string;
  status: BotShareStatus;
}

export interface PublicScanSummary {
  hostname: string;
  score: number;
  grade: ScoreGrade;
  files: {
    robotsTxt: boolean;
    llmsTxt: boolean;
    sitemapXml: boolean;
    securityTxt: boolean;
    manifestJson: boolean;
    adsTxt: boolean;
    humansTxt: boolean;
    aiTxt: boolean;
  };
  bots: BotSummary[];
  /** e.g. "example.com allows GPTBot, blocks ClaudeBot — Grade B" */
  headline: string;
}

/** Major bots we surface first in the headline, in priority order. */
const PRIORITY_BOTS = ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended", "CCBot"];

export function deriveBotStatus(raw: string): BotShareStatus {
  const lower = (raw || "").toLowerCase();
  const hasDisallow = lower.includes("disallow");
  // Strip "disallow" before testing for "allow" so it doesn't match as a substring.
  const hasAllow = lower.replace(/disallow/g, "").includes("allow");
  if (hasAllow && hasDisallow) return "mixed";
  if (hasDisallow) return "block";
  if (hasAllow) return "allow";
  return "unknown";
}

export function hostnameFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  }
}

function buildHeadline(hostname: string, bots: BotSummary[], grade: ScoreGrade): string {
  const allowed = bots.find((b) => b.status === "allow")?.name;
  const blocked = bots.find((b) => b.status === "block")?.name;

  const parts: string[] = [];
  if (allowed) parts.push(`allows ${allowed}`);
  if (blocked) parts.push(`blocks ${blocked}`);

  const lead = parts.length > 0 ? `${hostname} ${parts.join(", ")}` : `${hostname} AI crawler permissions`;
  return `${lead} — Grade ${grade}`;
}

export function toPublicScanSummary(scan: Scan): PublicScanSummary {
  const hostname = hostnameFromUrl(scan.url);
  const score = scan.score ?? 0;
  const grade = scoreToGrade(score);

  const permissions = (scan.botPermissions ?? {}) as Record<string, string>;
  const orderedNames = [
    ...PRIORITY_BOTS.filter((name) => name in permissions),
    ...Object.keys(permissions).filter((name) => !PRIORITY_BOTS.includes(name)),
  ];
  const bots: BotSummary[] = orderedNames.map((name) => ({
    name,
    status: deriveBotStatus(permissions[name]),
  }));

  return {
    hostname,
    score,
    grade,
    files: {
      robotsTxt: !!scan.robotsTxtFound,
      llmsTxt: !!scan.llmsTxtFound,
      sitemapXml: !!scan.sitemapXmlFound,
      securityTxt: !!scan.securityTxtFound,
      manifestJson: !!scan.manifestJsonFound,
      adsTxt: !!scan.adsTxtFound,
      humansTxt: !!scan.humansTxtFound,
      aiTxt: !!scan.aiTxtFound,
    },
    bots,
    headline: buildHeadline(hostname, bots, grade),
  };
}
