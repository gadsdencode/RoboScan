import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Globe, FileText, Bot, AlertCircle, CheckCircle2, Lock, Download, Shield, Crown, Sparkles } from "lucide-react";
import type { Scan } from "@shared/schema";

interface ScanWithPurchase extends Scan {
  isPurchased: boolean;
  isSubscriber?: boolean;
  hasFullAccess?: boolean;
}

interface ScanDetailsModalProps {
  open: boolean;
  onClose: () => void;
  scan: ScanWithPurchase | null;
  onUnlockClick?: (scan: ScanWithPurchase) => void;
  onSubscribeClick?: () => void;
  isAdmin?: boolean;
}

export function ScanDetailsModal({ open, onClose, scan, onUnlockClick, onSubscribeClick, isAdmin = false }: ScanDetailsModalProps) {
  if (!scan) return null;

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString();
  };

  // Determine access level
  const hasFullAccess = scan.hasFullAccess ?? (scan.isPurchased || isAdmin);
  const isSubscriber = scan.isSubscriber ?? false;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Scan Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* URL and Date */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-lg break-all">{scan.url}</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Scanned on {formatDate(scan.createdAt as any)}
            </p>
          </div>

          {/* Warnings and Errors - with blur for free tier */}
          {((scan.warnings && scan.warnings.length > 0) || (scan.errors && scan.errors.length > 0)) && (
            <div className="relative">
              {/* Blur overlay for free tier */}
              {!hasFullAccess && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg border border-primary/20">
                  <Lock className="w-6 h-6 text-primary mb-2" />
                  <p className="text-sm font-medium text-center px-4">
                    {scan.warnings?.length || 0} warning(s) and {scan.errors?.length || 0} error(s) found
                  </p>
                  <p className="text-xs text-muted-foreground text-center px-4 mt-1">
                    Unlock full details to see recommendations
                  </p>
                </div>
              )}
              
              <div className={`space-y-2 ${!hasFullAccess ? 'blur-sm pointer-events-none select-none' : ''}`}>
                {scan.warnings && scan.warnings.length > 0 && (
                  <div className="flex items-start gap-2 text-yellow-400 text-sm">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold">Warnings:</div>
                      <ul className="list-disc list-inside">
                        {scan.warnings.map((warning, i) => (
                          <li key={i} className="break-words">{warning}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
                {scan.errors && scan.errors.length > 0 && (
                  <div className="flex items-start gap-2 text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold">Errors:</div>
                      <ul className="list-disc list-inside">
                        {scan.errors.map((error, i) => (
                          <li key={i} className="break-words">{error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bot Permissions */}
          {scan.botPermissions && Object.keys(scan.botPermissions).length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Bot className="w-4 h-4 text-primary" />
                AI Bot Permissions ({Object.keys(scan.botPermissions).length} bots)
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(scan.botPermissions as Record<string, string>).map(([bot, permission]) => (
                  <div key={bot} className="flex items-center justify-between gap-2 p-2 bg-background/50 border border-white/5 rounded text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        permission.toLowerCase().includes('allow') || permission.toLowerCase().includes('yes')
                          ? 'bg-green-400' 
                          : permission.toLowerCase().includes('disallow') || permission.toLowerCase().includes('no')
                          ? 'bg-red-400'
                          : 'bg-yellow-400'
                      }`} />
                      <span className="font-mono truncate">{bot}</span>
                    </div>
                    <Badge variant="outline" className="text-xs flex-shrink-0">
                      {permission}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Files Found */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span className="text-sm">robots.txt:</span>
              {scan.robotsTxtFound ? (
                <CheckCircle2 className="w-4 h-4 text-green-400" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400" />
              )}
              <span className="text-xs text-muted-foreground">
                {scan.robotsTxtFound ? 'Found' : 'Not found'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span className="text-sm">llms.txt:</span>
              {scan.llmsTxtFound ? (
                <CheckCircle2 className="w-4 h-4 text-green-400" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400" />
              )}
              <span className="text-xs text-muted-foreground">
                {scan.llmsTxtFound ? 'Found' : 'Not found'}
              </span>
            </div>
          </div>

          {/* Premium Access CTA - Show upgrade options for free users */}
          {!hasFullAccess && (
            <div className="border border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-background rounded-lg p-4 space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/20">
                  <Lock className="w-5 h-5 text-primary flex-shrink-0" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold mb-1">Unlock Full Report</h4>
                  <p className="text-sm text-muted-foreground">
                    Get detailed analysis including full robots.txt and llms.txt content, optimization recommendations, and more.
                  </p>
                </div>
              </div>
              
              {/* Two options: One-time OR Subscribe */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* One-Time Purchase */}
                <div className="border border-border rounded-lg p-3 hover:border-primary/50 transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <Download className="w-4 h-4 text-primary" />
                    <span className="font-medium text-sm">This Report Only</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    One-time unlock for this scan
                  </p>
                  <Button
                    onClick={() => onUnlockClick?.(scan)}
                    variant="outline"
                    size="sm"
                    className="w-full"
                    data-testid="button-unlock-from-modal"
                  >
                    Unlock for $9.99
                  </Button>
                </div>
                
                {/* Subscribe (Best Value) */}
                <div className="border border-primary/50 rounded-lg p-3 bg-primary/5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] px-2 py-0.5 rounded-bl-lg font-medium">
                    BEST VALUE
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <Crown className="w-4 h-4 text-primary" />
                    <span className="font-medium text-sm">Guardian Plan</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Unlimited reports + recurring scans + 2x XP
                  </p>
                  <Button
                    onClick={() => onSubscribeClick?.()}
                    size="sm"
                    className="w-full btn-cta"
                    data-testid="button-subscribe-from-modal"
                  >
                    <Sparkles className="w-3 h-3 mr-1" />
                    $29/month
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Premium Content - Only shown if user has full access */}
          {hasFullAccess && (
            <div className="space-y-4">
              {/* Subscriber badge */}
              {isSubscriber && (
                <div className="flex items-center gap-2 text-xs text-primary">
                  <Crown className="w-3 h-3" />
                  <span>Guardian subscriber - Full access unlocked</span>
                </div>
              )}
              
              {scan.robotsTxtContent && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    robots.txt Content
                  </h4>
                  <pre className="bg-background/50 border border-white/5 rounded p-3 text-xs font-mono max-h-[300px] overflow-y-auto whitespace-pre-wrap break-all">
                    {scan.robotsTxtContent}
                  </pre>
                </div>
              )}
              {scan.llmsTxtContent && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    llms.txt Content
                  </h4>
                  <pre className="bg-background/50 border border-white/5 rounded p-3 text-xs font-mono max-h-[300px] overflow-y-auto whitespace-pre-wrap break-all">
                    {scan.llmsTxtContent}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Close Button */}
          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose} data-testid="button-close-modal">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
