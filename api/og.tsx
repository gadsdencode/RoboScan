// api/og.tsx
// Edge function that renders a dynamic Open Graph image for a shared scan.
// Usage: /api/og?token=<shareToken>. Fetches the public summary endpoint
// (which enforces the non-sensitive allowlist) and renders a 1200x630 card.

import { ImageResponse } from "@vercel/og";

export const config = { runtime: "edge" };

const GRADE_HEX: Record<string, string> = {
  A: "#4ade80",
  B: "#34d399",
  C: "#facc15",
  D: "#fb923c",
  F: "#f87171",
};

interface Summary {
  hostname: string;
  score: number;
  grade: string;
  bots: Array<{ name: string; status: string }>;
}

export default async function handler(req: Request) {
  const { searchParams, origin } = new URL(req.url);
  const token = searchParams.get("token");

  let summary: Summary | null = null;
  if (token) {
    try {
      const res = await fetch(`${origin}/api/share/${encodeURIComponent(token)}`);
      if (res.ok) summary = (await res.json()) as Summary;
    } catch {
      summary = null;
    }
  }

  const hostname = summary?.hostname ?? "your website";
  const score = summary?.score ?? 0;
  const grade = summary?.grade ?? "?";
  const gradeColor = GRADE_HEX[grade] ?? "#94a3b8";
  const allowed = summary?.bots.filter((b) => b.status === "allow").length ?? 0;
  const blocked = summary?.bots.filter((b) => b.status === "block").length ?? 0;

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #0b1220 0%, #111827 100%)",
          padding: "64px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", color: "#34d399", fontSize: 34, fontWeight: 700 }}>
          AI BotCheck
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column", maxWidth: "720px" }}>
            <div style={{ color: "#94a3b8", fontSize: 30, marginBottom: 12 }}>AI visibility score for</div>
            <div style={{ color: "#ffffff", fontSize: 64, fontWeight: 800 }}>{hostname}</div>
            <div style={{ color: "#cbd5e1", fontSize: 32, marginTop: 24 }}>
              {allowed} AI bots allowed · {blocked} blocked
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ color: gradeColor, fontSize: 200, fontWeight: 800, lineHeight: 1 }}>{grade}</div>
            <div style={{ color: "#94a3b8", fontSize: 36 }}>{score}/100</div>
          </div>
        </div>

        <div style={{ display: "flex", color: "#64748b", fontSize: 26 }}>
          Check your site free at aibotcheck.io
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
