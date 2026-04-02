import { AlertCircle, GitCompare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { PaymentModal } from "@/components/PaymentModal";
import { ScanComparison } from "@/components/ScanComparison";
import { TrophyCase } from "@/components/TrophyCase";
import { ScanDetailsModal } from "@/components/ScanDetailsModal";
import { NotificationSheet, type Notification } from "@/components/dashboard/NotificationSheet";
import type { ScanWithPurchase } from "@/components/dashboard/ScanList";
import type { User } from "@shared/schema";

export interface DashboardOverlaysProps {
  user: User | undefined;
  selectedScan: ScanWithPurchase | null;
  showPaymentModal: boolean;
  setShowPaymentModal: (v: boolean) => void;
  handlePaymentSuccess: () => void;
  showTrophyCase: boolean;
  setShowTrophyCase: (v: boolean) => void;
  showScanDetailsModal: boolean;
  setShowScanDetailsModal: (v: boolean) => void;
  scanDetailsData: ScanWithPurchase | null;
  setScanDetailsData: (v: ScanWithPurchase | null) => void;
  showNotificationsSheet: boolean;
  setShowNotificationsSheet: (v: boolean) => void;
  notifications: Notification[];
  unreadCount: number;
  handleMarkAllRead: () => Promise<void>;
  handleMarkNotificationRead: (id: number) => Promise<void>;
  formatRelativeTime: (date: string) => string;
  loadingScanId: number | null;
  setLoadingScanId: (v: number | null) => void;
  showComparison: boolean;
  setShowComparison: (v: boolean) => void;
  comparisonOldScan: ScanWithPurchase | null;
  comparisonNewScan: ScanWithPurchase | null;
  comparisonLabels: [string, string];
  setComparisonOldScan: (v: ScanWithPurchase | null) => void;
  setComparisonNewScan: (v: ScanWithPurchase | null) => void;
  showCompetitorDialog: boolean;
  setShowCompetitorDialog: (v: boolean) => void;
  competitorUrl: string;
  setCompetitorUrl: (v: string) => void;
  myUrlForCompare: string;
  setMyUrlForCompare: (v: string) => void;
  isAnalyzingCompetitor: boolean;
  competitorError: string | null;
  handleCompetitorAnalysis: () => Promise<void>;
  setSelectedScan: (v: ScanWithPurchase | null) => void;
}

export function DashboardOverlays({
  user,
  selectedScan,
  showPaymentModal,
  setShowPaymentModal,
  handlePaymentSuccess,
  showTrophyCase,
  setShowTrophyCase,
  showScanDetailsModal,
  setShowScanDetailsModal,
  scanDetailsData,
  setScanDetailsData,
  showNotificationsSheet,
  setShowNotificationsSheet,
  notifications,
  unreadCount,
  handleMarkAllRead,
  handleMarkNotificationRead,
  formatRelativeTime,
  loadingScanId,
  setLoadingScanId,
  showComparison,
  setShowComparison,
  comparisonOldScan,
  comparisonNewScan,
  comparisonLabels,
  setComparisonOldScan,
  setComparisonNewScan,
  showCompetitorDialog,
  setShowCompetitorDialog,
  competitorUrl,
  setCompetitorUrl,
  myUrlForCompare,
  setMyUrlForCompare,
  isAnalyzingCompetitor,
  competitorError,
  handleCompetitorAnalysis,
  setSelectedScan,
}: DashboardOverlaysProps) {
  return (
    <>
      {selectedScan && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          scanId={selectedScan.id}
          url={selectedScan.url}
          onSuccess={handlePaymentSuccess}
        />
      )}

      <NotificationSheet
        showNotificationsSheet={showNotificationsSheet}
        setShowNotificationsSheet={setShowNotificationsSheet}
        notifications={notifications}
        unreadCount={unreadCount}
        onMarkAllRead={handleMarkAllRead}
        onMarkNotificationRead={handleMarkNotificationRead}
        formatRelativeTime={formatRelativeTime}
        loadingScanId={loadingScanId}
        setLoadingScanId={setLoadingScanId}
        setScanDetailsData={setScanDetailsData}
        setShowScanDetailsModal={setShowScanDetailsModal}
      />

      <Dialog open={showComparison} onOpenChange={setShowComparison}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto [&>button]:hidden">
          {comparisonOldScan && comparisonNewScan && (
            <ScanComparison
              scanA={comparisonOldScan}
              scanB={comparisonNewScan}
              labels={comparisonLabels}
              onClose={() => {
                setShowComparison(false);
                setComparisonOldScan(null);
                setComparisonNewScan(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showCompetitorDialog} onOpenChange={setShowCompetitorDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitCompare className="w-5 h-5 text-primary" />
              Compare Sites
            </DialogTitle>
            <DialogDescription>
              Compare your website against a competitor to analyze differences
              in bot access configuration
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="my-url">Your Website URL</Label>
              <Input
                id="my-url"
                type="url"
                placeholder="example.com"
                value={myUrlForCompare}
                onChange={(e) => setMyUrlForCompare(e.target.value)}
                data-testid="input-my-url"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="competitor-url">Competitor Website URL</Label>
              <Input
                id="competitor-url"
                type="url"
                placeholder="competitor.com"
                value={competitorUrl}
                onChange={(e) => setCompetitorUrl(e.target.value)}
                data-testid="input-competitor-url"
              />
            </div>
            {competitorError && (
              <div
                className="text-sm text-red-400 flex items-center gap-2"
                data-testid="text-competitor-error"
              >
                <AlertCircle className="w-4 h-4" />
                {competitorError}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCompetitorDialog(false);
                setCompetitorUrl("");
                setMyUrlForCompare("");
              }}
              data-testid="button-cancel-competitor"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCompetitorAnalysis}
              disabled={
                isAnalyzingCompetitor ||
                !competitorUrl.trim() ||
                !myUrlForCompare.trim()
              }
              className="bg-primary text-primary-foreground hover:bg-primary/90 btn-hover-lift"
              data-testid="button-analyze-competitor"
            >
              {isAnalyzingCompetitor ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                  Analyzing...
                </>
              ) : (
                <>
                  <GitCompare className="w-4 h-4 mr-2" />
                  Compare
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TrophyCase open={showTrophyCase} onOpenChange={setShowTrophyCase} />

      <ScanDetailsModal
        open={showScanDetailsModal}
        onClose={() => {
          setShowScanDetailsModal(false);
          setScanDetailsData(null);
        }}
        scan={scanDetailsData}
        onUnlockClick={(scan) => {
          setSelectedScan(scan);
          setShowPaymentModal(true);
          setShowScanDetailsModal(false);
        }}
        onSubscribeClick={() => {
          setShowScanDetailsModal(false);
          window.location.href = "/pricing";
        }}
        isAdmin={user?.isAdmin}
      />
    </>
  );
}
