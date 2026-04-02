import { Activity, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ScanWithPurchase } from "@/components/dashboard/ScanList";
import type { RecurringScan } from "@/components/dashboard/RecurringScans";
import { formatRelativeTime } from "@/lib/formatRelativeTime";

export interface DashboardStatusCardProps {
  isAgencyView: boolean;
  recurringScans: RecurringScan[];
  scans: ScanWithPurchase[];
}

export function DashboardStatusCard({
  isAgencyView,
  recurringScans,
  scans,
}: DashboardStatusCardProps) {
  return (
    <Card className="p-6 border-border bg-card flex flex-col justify-between">
      {isAgencyView ? (
        <>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Fleet Status
              </h3>
            </div>
            <div className="mt-4">
              <span className="text-4xl font-bold text-primary">
                {recurringScans.filter((s) => s.isActive).length}
              </span>
              <span className="text-lg text-muted-foreground ml-2">
                Active Monitors
              </span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Sites requiring attention
              </span>
              <Badge
                variant="outline"
                className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30"
              >
                {
                  scans
                    .filter(
                      (s) =>
                        (s.errors && s.errors.length > 0) ||
                        (!s.robotsTxtFound && !s.llmsTxtFound)
                    )
                    .slice(0, recurringScans.length || 5).length
                }
              </Badge>
            </div>
          </div>
        </>
      ) : (
        <>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Site Health
              </h3>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span
                className={`text-5xl font-bold ${
                  (scans[0]?.score || 0) >= 80
                    ? "text-emerald-500"
                    : (scans[0]?.score || 0) >= 50
                      ? "text-yellow-500"
                      : "text-red-500"
                }`}
              >
                {scans[0]?.score || 0}
              </span>
              <span className="text-lg text-muted-foreground">/100</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Last scan</span>
              <span className="text-foreground">
                {scans[0]
                  ? formatRelativeTime(
                      scans[0].createdAt?.toString() || new Date().toISOString()
                    )
                  : "No scans yet"}
              </span>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
