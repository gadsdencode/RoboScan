import { describe, expect, it } from "vitest";
import {
  calculateScanScore,
  generateOptimizationReport,
} from "../server/report-generator";

const baseScan = {
  id: 1,
  userId: null,
  url: "example.com",
  robotsTxtFound: true,
  robotsTxtContent: "User-agent: *\nAllow: /\nSitemap: https://example.com/sitemap.xml",
  llmsTxtFound: true,
  llmsTxtContent: "# About\nhttps://example.com",
  sitemapXmlFound: true,
  sitemapXmlContent: "<xml />",
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
  botPermissions: { GPTBot: "Allowed" },
  errors: [],
  warnings: [],
  tags: [],
  score: 0,
  createdAt: new Date(),
};

describe("report scoring consistency", () => {
  it("uses canonical calculateScanScore result in generated report", () => {
    const expected = calculateScanScore(baseScan as any);
    const report = generateOptimizationReport(baseScan as any);
    expect(report.score).toBe(expected);
  });
});
