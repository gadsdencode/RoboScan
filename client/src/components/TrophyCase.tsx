import { useQuery } from "@tanstack/react-query";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription 
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { FileCode, Shield, Zap, Lock, Trophy } from "lucide-react";
import { ACHIEVEMENTS } from "@shared/gamification";

const IconMap: Record<string, any> = {
  FileCode,
  Shield,
  Zap
};

interface UnlockedAchievement {
  id: number;
  userId: string;
  achievementId: number;
  achievementKey: string;
  achievementName: string;
  achievementDescription: string;
  xpReward: number;
  icon: string;
  unlockedAt: string | null;
}

interface TrophyCaseProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TrophyCase({ open, onOpenChange }: TrophyCaseProps) {
  const { data: unlocked = [], isLoading } = useQuery<UnlockedAchievement[]>({
    queryKey: ["/api/user/achievements"],
    queryFn: async () => {
      const response = await fetch('/api/user/achievements');
      if (!response.ok) throw new Error('Failed to fetch achievements');
      return response.json();
    },
    enabled: open,
  });

  const unlockedKeys = new Set(unlocked.map(a => a.achievementKey));
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl bg-card border-primary/20">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Trophy className="w-6 h-6 text-yellow-500" />
            Trophy Case
          </DialogTitle>
          <DialogDescription>
            Your hall of fame. Unlock badges by mastering the platform.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {Object.values(ACHIEVEMENTS).map((achievement) => {
                const Icon = IconMap[achievement.icon] || Trophy;
                const isUnlocked = unlockedKeys.has(achievement.key);
                
                return (
                  <div 
                    key={achievement.key}
                    data-testid={`achievement-${achievement.key.toLowerCase()}`}
                    className={`
                      relative overflow-hidden rounded-xl border p-4 transition-all
                      ${isUnlocked 
                        ? "bg-primary/10 border-primary/50 shadow-[0_0_15px_rgba(0,255,255,0.15)]" 
                        : "bg-muted/30 border-white/5 opacity-70 grayscale"
                      }
                    `}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`
                        p-3 rounded-lg shrink-0
                        ${isUnlocked ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}
                      `}>
                        <Icon className="w-6 h-6" />
                      </div>
                      
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold font-mono text-sm tracking-tight" data-testid={`text-achievement-name-${achievement.key.toLowerCase()}`}>
                            {achievement.name}
                          </h4>
                          {isUnlocked ? (
                            <Badge 
                              variant="default" 
                              className="bg-primary/20 text-primary border-primary/30 h-5 text-[10px]"
                              data-testid={`badge-unlocked-${achievement.key.toLowerCase()}`}
                            >
                              UNLOCKED
                            </Badge>
                          ) : (
                            <Lock className="w-3 h-3 text-muted-foreground" data-testid={`icon-locked-${achievement.key.toLowerCase()}`} />
                          )}
                        </div>
                        
                        <p className="text-xs text-muted-foreground line-clamp-2" data-testid={`text-achievement-description-${achievement.key.toLowerCase()}`}>
                          {achievement.description}
                        </p>
                        
                        <div className="pt-2 flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
                          <Zap className="w-3 h-3" />
                          <span data-testid={`text-achievement-xp-${achievement.key.toLowerCase()}`}>{achievement.xpReward} XP Reward</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
