import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { ScanWithPurchase } from "@/components/dashboard/ScanList";
import type { SettingsPanelHandle } from "@/components/dashboard/SettingsPanel";
import { formatRelativeTime } from "@/lib/formatRelativeTime";
import { downloadFile } from "@/lib/downloadFile";
import { queryKeys } from "@/lib/queryKeys";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useScans } from "@/hooks/dashboard/useScans";
import { useNotifications } from "@/hooks/dashboard/useNotifications";
import { useComparison } from "@/hooks/dashboard/useComparison";
import { useRecurringScans } from "@/hooks/dashboard/useRecurringScans";
import { useDashboardTour } from "@/hooks/dashboard/useDashboardTour";
import { useBotAccessTesting } from "@/hooks/dashboard/useBotAccessTesting";

export function useDashboardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { hasActiveSubscription } = useSubscription();
  const settingsPanelRef = useRef<SettingsPanelHandle>(null);

  const scansApi = useScans(hasActiveSubscription);
  const notificationsApi = useNotifications();
  const comparisonApi = useComparison({
    getScansForUrl: scansApi.getScansForUrl,
  });
  const recurringApi = useRecurringScans(settingsPanelRef);
  const tourApi = useDashboardTour(scansApi.loading, scansApi.scans.length);
  const botAccessApi = useBotAccessTesting();

  const [selectedScan, setSelectedScan] = useState<ScanWithPurchase | null>(
    null
  );
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showTrophyCase, setShowTrophyCase] = useState(false);
  const [showScanDetailsModal, setShowScanDetailsModal] = useState(false);
  const [scanDetailsData, setScanDetailsData] =
    useState<ScanWithPurchase | null>(null);
  const [loadingScanId, setLoadingScanId] = useState<number | null>(null);

  const isAgencyView =
    recurringApi.recurringScans.length > 1 || scansApi.allTags.length > 0;

  const handleUnlock = (scan: ScanWithPurchase) => {
    setSelectedScan(scan);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    void queryClient.invalidateQueries({ queryKey: queryKeys.userScans.root });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.userAccessSummary,
    });
  };

  return {
    user,
    settingsPanelRef,
    runTour: tourApi.runTour,
    isAgencyView,
    recurringScans: recurringApi.recurringScans,
    scans: scansApi.scans,
    loading: scansApi.loading,
    allTags: scansApi.allTags,
    selectedTags: scansApi.selectedTags,
    showTagFilter: scansApi.showTagFilter,
    setShowTagFilter: scansApi.setShowTagFilter,
    comparisonMode: comparisonApi.comparisonMode,
    selectedScanForComparison: comparisonApi.selectedScanForComparison,
    expandedScan: scansApi.expandedScan,
    setExpandedScan: scansApi.setExpandedScan,
    hasActiveSubscription,
    fetchScans: scansApi.fetchScans,
    fetchAllTags: scansApi.fetchAllTags,
    handleUnlock,
    handlePaymentSuccess,
    downloadFile,
    testBotAccess: botAccessApi.testBotAccess,
    botAccessTests: botAccessApi.botAccessTests,
    testingBots: botAccessApi.testingBots,
    handleCompareScans: comparisonApi.handleCompareScans,
    cancelComparison: comparisonApi.cancelComparison,
    getScansForUrl: scansApi.getScansForUrl,
    handleQuickCompare: comparisonApi.handleQuickCompare,
    handleToggleTagFilter: scansApi.handleToggleTagFilter,
    handleClearTagFilter: scansApi.handleClearTagFilter,
    handleAddTag: scansApi.handleAddTag,
    handleRemoveTag: scansApi.handleRemoveTag,
    handleScanComplete: scansApi.handleScanComplete,
    onRecurringScansChange: recurringApi.onRecurringScansChange,
    openPreferences: recurringApi.openPreferences,
    selectedScan,
    setSelectedScan,
    showPaymentModal,
    setShowPaymentModal,
    showTrophyCase,
    setShowTrophyCase,
    showScanDetailsModal,
    setShowScanDetailsModal,
    scanDetailsData,
    setScanDetailsData,
    showNotificationsSheet: notificationsApi.showNotificationsSheet,
    setShowNotificationsSheet: notificationsApi.setShowNotificationsSheet,
    notifications: notificationsApi.notifications,
    unreadCount: notificationsApi.unreadCount,
    handleMarkAllRead: notificationsApi.handleMarkAllRead,
    handleMarkNotificationRead: notificationsApi.handleMarkNotificationRead,
    formatRelativeTime,
    loadingScanId,
    setLoadingScanId,
    showComparison: comparisonApi.showComparison,
    setShowComparison: comparisonApi.setShowComparison,
    comparisonOldScan: comparisonApi.comparisonOldScan,
    comparisonNewScan: comparisonApi.comparisonNewScan,
    comparisonLabels: comparisonApi.comparisonLabels,
    setComparisonOldScan: comparisonApi.setComparisonOldScan,
    setComparisonNewScan: comparisonApi.setComparisonNewScan,
    showCompetitorDialog: comparisonApi.showCompetitorDialog,
    setShowCompetitorDialog: comparisonApi.setShowCompetitorDialog,
    competitorUrl: comparisonApi.competitorUrl,
    setCompetitorUrl: comparisonApi.setCompetitorUrl,
    myUrlForCompare: comparisonApi.myUrlForCompare,
    setMyUrlForCompare: comparisonApi.setMyUrlForCompare,
    isAnalyzingCompetitor: comparisonApi.isAnalyzingCompetitor,
    competitorError: comparisonApi.competitorError,
    handleCompetitorAnalysis: comparisonApi.handleCompetitorAnalysis,
  };
}
