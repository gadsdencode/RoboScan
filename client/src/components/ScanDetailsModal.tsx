import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Globe, FileText, Bot, AlertCircle, CheckCircle2, Lock, Download, Shield } from "lucide-react";
import type { Scan } from "@shared/schema";

interface ScanWithPurchase extends Scan {
  isPurchased: boolean;
}

interface ScanDetailsModalProps {
  open: boolean;
  onClose: () => void;
  scan: ScanWithPurchase | null;
  onUnlockClick?: (scan: ScanWithPurchase) => void;
}

export function ScanDetailsModal({ open, onClose, scan, onUnlockClick }: ScanDetailsModalProps) {
  if (!scan) return null;

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString();
  };

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

          {/* Warnings and Errors */}
          {((scan.warnings && scan.warnings.length > 0) || (scan.errors && scan.errors.length > 0)) && (
            <div className="space-y-2">
              {scan.warnings && scan.warnings.length > 0 && (
                <div className="flex items-start gap-2 text-yellow-400 text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold">Warnings:</div>
                    <ul className="list-disc list-inside">
                      {scan.warnings.map((warning, i) => (
                        <li key={i}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
              {scan.errors && scan.errors.length > 0 && (
                <div className="flex items-start gap-2 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold">Errors:</div>
                    <ul className="list-disc list-inside">
                      {scan.errors.map((error, i) => (
                        <li key={i}>{error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
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

          {/* Premium Report CTA */}
          {!scan.isPurchased && (
            <div className="border border-primary/30 bg-primary/10 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Lock className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold mb-1">Premium Report Available</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Unlock detailed analysis including full robots.txt and llms.txt content, optimization recommendations, and more.
                  </p>
                  <Button
                    onClick={() => onUnlockClick?.(scan)}
                    className="gap-2"
                    data-testid="button-unlock-from-modal"
                  >
                    <Download className="w-4 h-4" />
                    Unlock for $9.99
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Premium Content - Only shown if purchased */}
          {scan.isPurchased && (
            <div className="space-y-4">
              {scan.robotsTxtContent && (
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    robots.txt Content
                  </h4>
                  <pre className="bg-background/50 border border-white/5 rounded p-3 text-xs overflow-x-auto font-mono">
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
                  <pre className="bg-background/50 border border-white/5 rounded p-3 text-xs overflow-x-auto font-mono">
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
