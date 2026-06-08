// client/src/components/ScoreCard.tsx
// Reusable, presentational score card for a scan result. Visual treatment matches
// the existing PremiumReport score block (same color tokens). Shows only public
// summary data (grade + bot allow/block matrix) — no premium content.
import { CheckCircle, XCircle, MinusCircle, Bot } from "lucide-react";
import { Card } from "@/components/ui/card";
import { gradeMeta } from "@shared/scoreGrade";
import type { BotSummary } from "@shared/publicScanSummary";

interface ScoreCardProps {
  hostname: string;
  score: number;
  bots: BotSummary[];
}

function statusIcon(status: BotSummary["status"]) {
  if (status === "allow") return <CheckCircle className="w-4 h-4 text-green-400" />;
  if (status === "block") return <XCircle className="w-4 h-4 text-red-400" />;
  return <MinusCircle className="w-4 h-4 text-muted-foreground" />;
}

function statusLabel(status: BotSummary["status"]) {
  if (status === "allow") return "Allowed";
  if (status === "block") return "Blocked";
  if (status === "mixed") return "Mixed";
  return "Not specified";
}

export function ScoreCard({ hostname, score, bots }: ScoreCardProps) {
  const meta = gradeMeta(score);

  return (
    <Card
      className="p-6 md:p-8 bg-card border border-border"
      data-testid="score-card"
    >
      <div className="flex items-center justify-between gap-6 flex-wrap">
        <div>
          <div className="text-sm text-muted-foreground mb-1">AI visibility score</div>
          <div className="font-mono text-lg font-semibold break-all">{hostname}</div>
        </div>
        <div className="flex items-center gap-5">
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Score</div>
            <div className={`text-3xl font-bold ${meta.colorClass}`}>
              {score}
              <span className="text-base text-muted-foreground">/100</span>
            </div>
          </div>
          <div
            className={`flex items-center justify-center w-16 h-16 rounded-2xl border-2 text-4xl font-extrabold ${meta.colorClass}`}
            style={{ borderColor: meta.hex }}
            aria-label={`Grade ${meta.grade}`}
          >
            {meta.grade}
          </div>
        </div>
      </div>

      {bots.length > 0 && (
        <div className="mt-6 pt-6 border-t border-border">
          <div className="flex items-center gap-2 text-sm font-medium mb-3">
            <Bot className="w-4 h-4 text-primary" />
            AI crawler permissions
          </div>
          <ul className="grid sm:grid-cols-2 gap-2">
            {bots.map((bot) => (
              <li
                key={bot.name}
                className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background/50 px-3 py-2"
                data-testid={`score-bot-${bot.name}`}
              >
                <span className="font-mono text-sm">{bot.name}</span>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {statusIcon(bot.status)}
                  {statusLabel(bot.status)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
