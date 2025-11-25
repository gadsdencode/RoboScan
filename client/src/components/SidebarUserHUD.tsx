import { useAuth } from "@/hooks/useAuth";
import { Progress } from "@/components/ui/progress";
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";
import { getLevelProgress, getNextLevelXp } from "@/lib/gamification-utils";
import { Trophy, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function SidebarUserHUD() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="px-2 py-2">
        <div className="flex items-center gap-2 mb-2">
          <Skeleton className="h-8 w-8 rounded-md" />
          <div className="space-y-1 flex-1">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-2 w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const xp = user.xp || 0;
  const level = user.level || 1;
  const progress = getLevelProgress(xp, level);
  const nextLevelXp = getNextLevelXp(level);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <div className="px-2 py-1.5 group-data-[collapsible=icon]:hidden">
          {/* Header: Level & Title */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="bg-primary/10 text-primary p-1.5 rounded-md ring-1 ring-primary/20">
                <Trophy className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold tracking-tight">
                  Level {level}
                </span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">
                  Bot Hunter
                </span>
              </div>
            </div>
            <div className="text-[10px] font-mono text-muted-foreground">
              {xp} / {nextLevelXp} XP
            </div>
          </div>

          {/* Progress Bar */}
          <div className="relative">
            <Progress value={progress} className="h-2 bg-primary/10" />
            
            {/* Juice: Sparkle icon at the end of the bar if nearing level up */}
            {progress > 90 && (
              <Sparkles 
                className="absolute -right-1 -top-3 w-4 h-4 text-yellow-400 animate-pulse" 
                fill="currentColor"
              />
            )}
          </div>
        </div>
        
        {/* Collapsed State Fallback (Icon Only) */}
        <SidebarMenuButton 
          tooltip={`Level ${level} (${Math.round(progress)}%)`}
          className="hidden group-data-[collapsible=icon]:flex"
        >
          <Trophy className="w-4 h-4 text-primary" />
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
