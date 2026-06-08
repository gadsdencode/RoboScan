// server/controllers/shareController.ts
// Public, unauthenticated share endpoints:
//   GET /api/share/:token  -> non-sensitive public scan summary (JSON)
//   GET /api/badge/:token  -> embeddable SVG badge linking back to aibotcheck.io
// Both expose ONLY the allowlisted summary (see toPublicScanSummary).

import { Router, Response, Request } from "express";
import { storage } from "../storage.js";
import { verifyScanShareToken } from "../utils/shareToken.js";
import { toPublicScanSummary, type PublicScanSummary } from "../../shared/publicScanSummary.js";
import { gradeMeta } from "../../shared/scoreGrade.js";

async function loadSummary(token: string): Promise<PublicScanSummary | null> {
  const verified = verifyScanShareToken(token);
  if (!verified) return null;
  const scan = await storage.getScan(verified.scanId);
  if (!scan) return null;
  return toPublicScanSummary(scan);
}

export const shareController = Router();

shareController.get("/:token", async (req: Request, res: Response) => {
  try {
    const summary = await loadSummary(req.params.token);
    if (!summary) {
      return res.status(404).json({ message: "Share link not found or expired" });
    }
    res.setHeader("Cache-Control", "public, max-age=300, s-maxage=600");
    res.json(summary);
  } catch (error) {
    console.error("[ShareController] summary error:", error);
    res.status(500).json({ message: "Failed to load shared scan" });
  }
});

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderBadgeSvg(summary: PublicScanSummary): string {
  const meta = gradeMeta(summary.score);
  const leftText = "AI BotCheck";
  const rightText = `Grade ${meta.grade}`;
  // shields.io-style fixed layout (no text-measuring deps).
  const leftWidth = 92;
  const rightWidth = 78;
  const total = leftWidth + rightWidth;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="20" role="img" aria-label="${escapeXml(leftText)}: ${escapeXml(rightText)}">
  <linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient>
  <clipPath id="r"><rect width="${total}" height="20" rx="3" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${leftWidth}" height="20" fill="#1f2937"/>
    <rect x="${leftWidth}" width="${rightWidth}" height="20" fill="${meta.hex}"/>
    <rect width="${total}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
    <text x="${leftWidth / 2}" y="14">${escapeXml(leftText)}</text>
    <text x="${leftWidth + rightWidth / 2}" y="14" fill="#0b1220" font-weight="bold">${escapeXml(rightText)}</text>
  </g>
</svg>`;
}

export const badgeController = Router();

badgeController.get("/:token", async (req: Request, res: Response) => {
  try {
    const summary = await loadSummary(req.params.token);
    res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=86400");
    if (!summary) {
      // Render a neutral badge rather than a 404 image so embeds never break.
      res.send(
        `<svg xmlns="http://www.w3.org/2000/svg" width="150" height="20"><rect width="150" height="20" rx="3" fill="#1f2937"/><text x="75" y="14" fill="#fff" text-anchor="middle" font-family="Verdana,sans-serif" font-size="11">AI BotCheck</text></svg>`,
      );
      return;
    }
    res.send(renderBadgeSvg(summary));
  } catch (error) {
    console.error("[ShareController] badge error:", error);
    res.status(500).send("");
  }
});
