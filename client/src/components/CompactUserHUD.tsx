import { useAuth } from "@/hooks/useAuth";
import { Progress } from "@/components/ui/progress";
import { getLevelProgress, getNextLevelXp } from "@/lib/gamification-utils";
import { Trophy, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function CompactUserHUD() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5">
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

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div 
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-smooth cursor-help btn-hover-scale"
          data-testid="hud-level-display"
        >
          {/* Level Badge */}
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

          {/* Level Info */}
          <div className="flex flex-col gap-1 min-w-[80px]">
            <div className="flex items-baseline gap-1">
              <span className="text-xs font-bold text-foreground">
                Level {level}
              </span>
              <span className="text-[9px] text-muted-foreground font-mono">
                ({Math.round(progress)}%)
              </span>
            </div>
            
            {/* Progress Bar */}
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
          <div className="font-semibold text-sm">Bot Hunter - Level {level}</div>
          <div className="text-xs space-y-1">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Current XP:</span>
              <span className="font-mono">{xp.toLocaleString()}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Progress:</span>
              <span className="font-mono">{xpInCurrentLevel} / {xpNeededForLevel}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Next Level:</span>
              <span className="font-mono">{nextLevelXp.toLocaleString()} XP</span>
            </div>
          </div>
          <div className="text-[10px] text-muted-foreground pt-1 border-t border-white/10">
            💡 Earn 10 XP per scan, +40 XP for perfect scans!
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
