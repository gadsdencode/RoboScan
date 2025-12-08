import { Repeat, Plus, Globe, Clock, Play, Pause, Settings, Trash2, Crown, Lock, Sparkles, Bell, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRecurringScanAccess } from "@/hooks/useAccessControl";

export interface RecurringScan {
  id: number;
  url: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  isActive: boolean;
  lastRunAt: string | null;
  nextRunAt: string;
  createdAt: string;
}

interface RecurringScansProps {
  recurringScans: RecurringScan[];
  showCreateRecurringDialog: boolean;
  setShowCreateRecurringDialog: (show: boolean) => void;
  newRecurringUrl: string;
  setNewRecurringUrl: (url: string) => void;
  newRecurringFrequency: 'daily' | 'weekly' | 'monthly';
  setNewRecurringFrequency: (freq: 'daily' | 'weekly' | 'monthly') => void;
  isCreatingRecurring: boolean;
  onCreateRecurringScan: () => Promise<void>;
  onToggleRecurringScan: (id: number, currentlyActive: boolean) => Promise<void>;
  onDeleteRecurringScan: (id: number) => Promise<void>;
  onOpenPreferences: (scan: RecurringScan) => Promise<void>;
  getFrequencyLabel: (frequency: string) => string;
  formatRelativeTime: (date: string) => string;
  onSubscribeClick?: () => void;
}

export function RecurringScans({
  recurringScans,
  showCreateRecurringDialog,
  setShowCreateRecurringDialog,
  newRecurringUrl,
  setNewRecurringUrl,
  newRecurringFrequency,
  setNewRecurringFrequency,
  isCreatingRecurring,
  onCreateRecurringScan,
  onToggleRecurringScan,
  onDeleteRecurringScan,
  onOpenPreferences,
  getFrequencyLabel,
  formatRelativeTime,
  onSubscribeClick,
}: RecurringScansProps) {
  const { canCreateRecurringScans, requiresSubscription, isLoading } = useRecurringScanAccess();

  // Show subscription gate for non-subscribers
  if (requiresSubscription && !isLoading) {
    return (
      <Card className="p-6 bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20 mb-8 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-lg bg-primary/20">
              <Crown className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                Recurring Scans
                <Badge variant="outline" className="text-xs border-primary/50 text-primary">
                  Guardian Feature
                </Badge>
              </h2>
            </div>
          </div>

          <p className="text-muted-foreground mb-6 max-w-lg">
            Automate your security monitoring with recurring scans. Get notified when your 
            robots.txt or llms.txt files change, ensuring your AI bot configurations stay optimal.
          </p>

          {/* Feature highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="flex items-start gap-3 p-3 bg-background/50 rounded-lg border border-white/5">
              <div className="p-1.5 rounded bg-green-500/20">
                <Bell className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <div className="font-medium text-sm">Change Alerts</div>
                <div className="text-xs text-muted-foreground">Real-time notifications</div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-background/50 rounded-lg border border-white/5">
              <div className="p-1.5 rounded bg-blue-500/20">
                <Shield className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <div className="font-medium text-sm">Daily/Weekly/Monthly</div>
                <div className="text-xs text-muted-foreground">Flexible scheduling</div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-background/50 rounded-lg border border-white/5">
              <div className="p-1.5 rounded bg-yellow-500/20">
                <Zap className="w-4 h-4 text-yellow-400" />
              </div>
              <div>
                <div className="font-medium text-sm">2x XP Bonus</div>
                <div className="text-xs text-muted-foreground">Level up faster</div>
              </div>
            </div>
          </div>

          <Button
            onClick={onSubscribeClick}
            className="btn-cta"
            data-testid="button-subscribe-recurring"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Upgrade to Guardian - $29/month
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-6 bg-card border-white/5 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Repeat className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold">Recurring Scans</h2>
            <Badge variant="outline" className="text-xs border-primary/30 text-primary">
              <Crown className="w-3 h-3 mr-1" />
              Guardian
            </Badge>
          </div>
          <Button
            onClick={() => setShowCreateRecurringDialog(true)}
            size="sm"
            className="bg-primary text-primary-foreground hover:bg-primary/90 btn-hover-scale"
            data-testid="button-create-recurring"
            disabled={!canCreateRecurringScans}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Recurring Scan
          </Button>
        </div>

        {recurringScans.length === 0 ? (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/20 rounded-full mb-3">
              <Repeat className="w-6 h-6 text-primary" />
            </div>
            <p className="text-muted-foreground text-sm">
              No recurring scans yet. Set up automatic monitoring to get notified of changes.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {recurringScans.map((scan) => (
              <div
                key={scan.id}
                className="p-4 bg-background/50 border border-white/5 rounded-lg hover:border-primary/20 transition-all"
                data-testid={`recurring-scan-${scan.id}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Globe className="w-4 h-4 text-primary flex-shrink-0" />
                      <span className="font-mono font-semibold">{scan.url}</span>
                      <Badge
                        variant={scan.isActive ? "default" : "secondary"}
                        className={scan.isActive ? "bg-green-500/20 text-green-400 border-green-500/30" : ""}
                      >
                        {scan.isActive ? 'Active' : 'Paused'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {getFrequencyLabel(scan.frequency)}
                      </span>
                      {scan.lastRunAt && (
                        <span>Last scan: {formatRelativeTime(scan.lastRunAt)}</span>
                      )}
                      <span>Next: {new Date(scan.nextRunAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onToggleRecurringScan(scan.id, scan.isActive)}
                      className="btn-hover-scale group"
                      data-testid={`button-toggle-${scan.id}`}
                    >
                      {scan.isActive ? (
                        <Pause className="w-4 h-4 group-hover:text-primary transition-colors" />
                      ) : (
                        <Play className="w-4 h-4 group-hover:text-primary transition-colors" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onOpenPreferences(scan)}
                      className="btn-hover-scale group"
                      data-testid={`button-preferences-${scan.id}`}
                    >
                      <Settings className="w-4 h-4 group-hover:text-primary transition-colors" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteRecurringScan(scan.id)}
                      className="text-red-400 hover:text-red-300 btn-hover-scale"
                      data-testid={`button-delete-${scan.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Create Recurring Scan Dialog */}
      <Dialog open={showCreateRecurringDialog} onOpenChange={setShowCreateRecurringDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Repeat className="w-5 h-5 text-primary" />
              Create Recurring Scan
            </DialogTitle>
            <DialogDescription>
              Set up automatic monitoring to get notified when your website's bot configuration changes
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="url">Website URL</Label>
              <Input
                id="url"
                type="url"
                placeholder="example.com"
                value={newRecurringUrl}
                onChange={(e) => setNewRecurringUrl(e.target.value)}
                data-testid="input-recurring-url"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="frequency">Scan Frequency</Label>
              <Select value={newRecurringFrequency} onValueChange={(value: any) => setNewRecurringFrequency(value)}>
                <SelectTrigger id="frequency" data-testid="select-frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateRecurringDialog(false)}
              data-testid="button-cancel-recurring"
            >
              Cancel
            </Button>
            <Button
              onClick={onCreateRecurringScan}
              disabled={isCreatingRecurring || !newRecurringUrl.trim()}
              className="bg-primary text-primary-foreground hover:bg-primary/90 btn-hover-lift"
              data-testid="button-confirm-recurring"
            >
              {isCreatingRecurring ? 'Creating...' : 'Create Scan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
