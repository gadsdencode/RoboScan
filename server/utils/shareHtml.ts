// server/utils/shareHtml.ts
// Builds the SPA HTML shell for /s/:token with per-scan Open Graph / Twitter meta
// injected so social crawlers unfurl the shared score. Returns null when no built
// index.html exists (dev), so the caller can fall through to the dev SPA server.

import fs from "fs";
import path from "path";
import { storage } from "../storage.js";
import { verifyScanShareToken } from "./shareToken.js";
import { toPublicScanSummary } from "../../shared/publicScanSummary.js";

const SITE_ORIGIN = process.env.PUBLIC_SITE_ORIGIN || "https://www.aibotcheck.io";

function findIndexHtml(): string | null {
  const candidates = [
    path.resolve(import.meta.dirname, "..", "..", "dist", "public", "index.html"),
    path.resolve(import.meta.dirname, "..", "..", "public", "index.html"),
  ];
  return candidates.find((p) => fs.existsSync(p)) ?? null;
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function renderShareHtml(token: string): Promise<string | null> {
  const indexPath = findIndexHtml();
  if (!indexPath) return null; // dev / no build: let the SPA server handle it

  let html = await fs.promises.readFile(indexPath, "utf-8");

  const shareUrl = `${SITE_ORIGIN}/s/${encodeURIComponent(token)}`;
  let title = "Shared AI visibility score | AI BotCheck";
  let description =
    "See which AI bots can access this website — robots.txt, llms.txt, and AI crawler permissions, scored by AI BotCheck.";
  let ogImage = `${SITE_ORIGIN}/og-image.png`;

  const verified = verifyScanShareToken(token);
  if (verified) {
    const scan = await storage.getScan(verified.scanId);
    if (scan) {
      const summary = toPublicScanSummary(scan);
      title = `${summary.headline} | AI BotCheck`;
      const allowed = summary.bots.filter((b) => b.status === "allow").length;
      const blocked = summary.bots.filter((b) => b.status === "block").length;
      description = `${summary.hostname} scored ${summary.score}/100 (Grade ${summary.grade}). ${allowed} AI bot(s) allowed, ${blocked} blocked. Scan your own site free with AI BotCheck.`;
      ogImage = `${SITE_ORIGIN}/api/og?token=${encodeURIComponent(token)}`;
    }
  }

  const meta = [
    `<title>${escapeAttr(title)}</title>`,
    `<meta name="description" content="${escapeAttr(description)}" />`,
    `<link rel="canonical" href="${escapeAttr(shareUrl)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="AI BotCheck" />`,
    `<meta property="og:title" content="${escapeAttr(title)}" />`,
    `<meta property="og:description" content="${escapeAttr(description)}" />`,
    `<meta property="og:url" content="${escapeAttr(shareUrl)}" />`,
    `<meta property="og:image" content="${escapeAttr(ogImage)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeAttr(title)}" />`,
    `<meta name="twitter:description" content="${escapeAttr(description)}" />`,
    `<meta name="twitter:image" content="${escapeAttr(ogImage)}" />`,
  ].join("\n    ");

  // Inject right before </head>.
  html = html.replace("</head>", `    ${meta}\n  </head>`);
  return html;
}
