import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useAccessControl } from "@/hooks/useAccessControl";
import { Progress } from "@/components/ui/progress";
import { getLevelProgress, getNextLevelXp } from "@/lib/gamification-utils";
import { Trophy, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { subscribeGamificationEvent } from "@/lib/gamification-events";
import { ACHIEVEMENTS } from "@shared/gamification";

interface AchievementsApiPayload {
  unlocked: Array<{ achievementKey: string }>;
  totalDefined: number;
}

async function fetchAchievementsSummary(): Promise<AchievementsApiPayload> {
  const res = await fetch("/api/user/achievements", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch achievements");
  return res.json();
}

export function CompactUserHUD() {
  const { user, isLoading } = useAuth();
  const { tier, accessLevel } = useAccessControl();
  const [xpPulse, setXpPulse] = useState(false);

  const { data: achPayload } = useQuery({
    queryKey: ["/api/user/achievements"],
    queryFn: fetchAchievementsSummary,
    staleTime: 1000 * 60 * 5,
    enabled: !!user,
  });

  useEffect(() => {
    return subscribeGamificationEvent("xp_gained", () => {
      setXpPulse(true);
      window.setTimeout(() => setXpPulse(false), 700);
    });
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card">
        <Skeleton className="h-6 w-6 rounded" />
        <div className="space-y-1">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-1.5 w-24" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  const xp = user.xp || 0;
  const level = user.level || 1;
  const progress = getLevelProgress(xp, level);
  const nextLevelXp = getNextLevelXp(level);
  const currentLevelBaseXp = 100 * Math.pow(level - 1, 2);
  const xpInCurrentLevel = xp - currentLevelBaseXp;
  const xpNeededForLevel = nextLevelXp - currentLevelBaseXp;

  const tierLabel =
    tier === "guardian" ? "Guardian" : tier === "architect" ? "Architect" : "Scout";
  const unlockedCount = achPayload?.unlocked?.length ?? 0;
  const totalAch =
    achPayload?.totalDefined ?? Object.keys(ACHIEVEMENTS).length;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-card/80 transition-smooth cursor-help btn-hover-scale ${
            xpPulse ? "ring-2 ring-primary/60 shadow-[0_0_12px_rgba(0,255,255,0.25)]" : ""
          }`}
          data-testid="hud-level-display"
        >
          <div className="relative">
            <div className="bg-primary/20 text-primary p-1.5 rounded ring-1 ring-primary/30">
              <Trophy className="w-4 h-4" />
            </div>
            {progress > 90 && (
              <Sparkles
                className="absolute -top-1 -right-1 w-3 h-3 text-yellow-400 animate-pulse"
                fill="currentColor"
              />
            )}
          </div>

          <div className="flex flex-col gap-1 min-w-[80px]">
            <div className="flex items-baseline gap-1">
              <span className="text-xs font-bold text-foreground">
                Level {level}
              </span>
              <span className="text-[9px] text-muted-foreground font-mono">
                ({Math.round(progress)}%)
              </span>
            </div>

            <Progress
              value={progress}
              className="h-1.5 bg-primary/10"
              data-testid="hud-progress-bar"
            />
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        <div className="space-y-2">
          <div className="font-semibold text-sm">
            Bot Hunter — {tierLabel} — Level {level}
          </div>
          {accessLevel.hasXpMultiplier && (
            <div className="text-[10px] font-mono rounded border border-primary/30 bg-primary/10 px-2 py-0.5 text-primary inline-block">
              2× XP Active
            </div>
          )}
          <div className="text-xs space-y-1">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Achievements:</span>
              <span className="font-mono">
                {unlockedCount}/{totalAch}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Current XP:</span>
              <span className="font-mono">{xp.toLocaleString()}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Progress:</span>
              <span className="font-mono">
                {xpInCurrentLevel} / {xpNeededForLevel}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Next Level:</span>
              <span className="font-mono">{nextLevelXp.toLocaleString()} XP</span>
            </div>
          </div>
          <div className="text-[10px] text-muted-foreground pt-1 border-t border-border">
            Earn 10 XP per scan (base), +40 when both robots.txt and llms.txt are found
            {accessLevel.hasXpMultiplier ? "; subscribers earn 2× on eligible actions." : "."}
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
