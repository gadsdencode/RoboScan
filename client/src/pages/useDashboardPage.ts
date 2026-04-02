import { useCallback, useEffect, useRef, useState } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { getDashboardTourSteps } from "@/lib/tour-config";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import type { Notification } from "@/components/dashboard/NotificationSheet";
import type { ScanWithPurchase } from "@/components/dashboard/ScanList";
import type { RecurringScan } from "@/components/dashboard/RecurringScans";
import type { SettingsPanelHandle } from "@/components/dashboard/SettingsPanel";
import { formatRelativeTime } from "@/lib/formatRelativeTime";
import { useQueryClient } from "@tanstack/react-query";

export function useDashboardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { hasActiveSubscription } = useSubscription();
  const settingsPanelRef = useRef<SettingsPanelHandle>(null);

  const [scans, setScans] = useState<ScanWithPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedScan, setSelectedScan] = useState<ScanWithPurchase | null>(
    null
  );
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showTrophyCase, setShowTrophyCase] = useState(false);
  const [showScanDetailsModal, setShowScanDetailsModal] = useState(false);
  const [scanDetailsData, setScanDetailsData] =
    useState<ScanWithPurchase | null>(null);
  const [loadingScanId, setLoadingScanId] = useState<number | null>(null);
  const [expandedScan, setExpandedScan] = useState<number | null>(null);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotificationsSheet, setShowNotificationsSheet] = useState(false);

  const [comparisonMode, setComparisonMode] = useState(false);
  const [selectedScanForComparison, setSelectedScanForComparison] =
    useState<ScanWithPurchase | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonOldScan, setComparisonOldScan] =
    useState<ScanWithPurchase | null>(null);
  const [comparisonNewScan, setComparisonNewScan] =
    useState<ScanWithPurchase | null>(null);
  const [comparisonLabels, setComparisonLabels] = useState<[string, string]>([
    "Previous Scan",
    "Current Scan",
  ]);

  const [showCompetitorDialog, setShowCompetitorDialog] = useState(false);
  const [competitorUrl, setCompetitorUrl] = useState("");
  const [myUrlForCompare, setMyUrlForCompare] = useState("");
  const [isAnalyzingCompetitor, setIsAnalyzingCompetitor] = useState(false);
  const [competitorError, setCompetitorError] = useState<string | null>(null);

  const [allTags, setAllTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showTagFilter, setShowTagFilter] = useState(false);

  const [recurringScans, setRecurringScans] = useState<RecurringScan[]>([]);

  const [botAccessTests, setBotAccessTests] = useState<
    Record<
      string,
      {
        status: number;
        accessible: boolean;
        statusText: string;
        loading?: boolean;
      }
    >
  >({});
  const [testingBots, setTestingBots] = useState<Set<string>>(new Set());

  const isAgencyView = recurringScans.length > 1 || allTags.length > 0;

  const fetchScans = useCallback(async (tagFilter?: string[]) => {
    try {
      const params = new URLSearchParams();
      if (tagFilter && tagFilter.length > 0) {
        tagFilter.forEach((tag) => params.append("tags", tag));
      }
      const queryString = params.toString();
      const url = queryString
        ? `/api/user/scans?${queryString}`
        : "/api/user/scans";

      const response = await fetch(url, { credentials: "include" });
      if (response.ok) {
        const data = await response.json();
        const scanData = Array.isArray(data) ? data : (data.scans || []);
        setScans(scanData);
      }
    } catch (error) {
      console.error("Failed to fetch scans:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAllTags = useCallback(async () => {
    try {
      const response = await fetch("/api/user/tags", { credentials: "include" });
      if (response.ok) {
        const data = (await response.json()) as string[];
        setAllTags(data);
      }
    } catch (error) {
      console.error("Failed to fetch tags:", error);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications", {
        credentials: "include",
      });
      if (response.ok) {
        const data = (await response.json()) as Notification[];
        setNotifications(data);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications/unread-count", {
        credentials: "include",
      });
      if (response.ok) {
        const data = (await response.json()) as { count: number };
        setUnreadCount(data.count);
      }
    } catch (error) {
      console.error("Failed to fetch unread count:", error);
    }
  }, []);

  useEffect(() => {
    void fetchScans();
    void fetchNotifications();
    void fetchUnreadCount();
    void fetchAllTags();

    const interval = setInterval(() => {
      void fetchNotifications();
      void fetchUnreadCount();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchScans, fetchNotifications, fetchUnreadCount, fetchAllTags]);

  const runTour = useCallback(() => {
    const steps = getDashboardTourSteps();
    if (steps.length === 0) return;

    const driverObj = driver({
      showProgress: true,
      steps,
      popoverClass: "roboscan-driver-popover",
      onDestroyed: () => {
        localStorage.setItem("roboscan_tour_seen", "true");
      },
    });

    driverObj.drive();
  }, []);

  useEffect(() => {
    const hasSeenTour = localStorage.getItem("roboscan_tour_seen");
    if (!hasSeenTour && !loading && scans.length === 0) {
      setTimeout(runTour, 1000);
    }
  }, [loading, scans.length, runTour]);

  const handleUnlock = (scan: ScanWithPurchase) => {
    setSelectedScan(scan);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    void fetchScans();
    queryClient.invalidateQueries({ queryKey: ["user-access-summary"] });
  };

  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const testBotAccess = async (scanUrl: string, botName: string) => {
    const testKey = `${scanUrl}-${botName}`;

    setTestingBots((prev) => new Set(prev).add(testKey));

    try {
      const response = await fetch("/api/test-bot-access", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: scanUrl, botName }),
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setBotAccessTests((prev) => ({
          ...prev,
          [testKey]: {
            status: data.status,
            accessible: data.accessible,
            statusText: data.statusText,
          },
        }));
      }
    } catch (error) {
      console.error("Failed to test bot access:", error);
      setBotAccessTests((prev) => ({
        ...prev,
        [testKey]: {
          status: 0,
          accessible: false,
          statusText: "Test failed",
        },
      }));
    } finally {
      setTestingBots((prev) => {
        const next = new Set(prev);
        next.delete(testKey);
        return next;
      });
    }
  };

  const handleMarkNotificationRead = async (id: number) => {
    try {
      const response = await fetch(`/api/notifications/${id}/read`, {
        method: "PATCH",
        credentials: "include",
      });

      if (response.ok) {
        await fetchNotifications();
        await fetchUnreadCount();
      }
    } catch (error) {
      console.error("Mark notification read error:", error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const response = await fetch("/api/notifications/mark-all-read", {
        method: "POST",
        credentials: "include",
      });

      if (response.ok) {
        await fetchNotifications();
        await fetchUnreadCount();
      }
    } catch (error) {
      console.error("Mark all read error:", error);
    }
  };

  const handleCompareScans = (scan: ScanWithPurchase) => {
    if (!comparisonMode) {
      setComparisonMode(true);
      setSelectedScanForComparison(scan);
    } else {
      if (
        selectedScanForComparison &&
        selectedScanForComparison.id !== scan.id
      ) {
        const oldScan =
          new Date(selectedScanForComparison.createdAt) <
          new Date(scan.createdAt)
            ? selectedScanForComparison
            : scan;
        const newScan =
          new Date(selectedScanForComparison.createdAt) <
          new Date(scan.createdAt)
            ? scan
            : selectedScanForComparison;

        setComparisonOldScan(oldScan);
        setComparisonNewScan(newScan);
        setComparisonLabels(["Previous Scan", "Current Scan"]);
        setShowComparison(true);
        setComparisonMode(false);
        setSelectedScanForComparison(null);
      }
    }
  };

  const scanUrlForComparison = async (
    url: string
  ): Promise<ScanWithPurchase> => {
    const res = await fetch("/api/scan?async=true", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
      credentials: "include",
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        (errorData as { message?: string }).message || `Failed to scan ${url}`
      );
    }

    if (res.status === 202) {
      const { jobId } = await res.json();
      const maxAttempts = 120;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const statusRes = await fetch(`/api/scan-jobs/${jobId}/status`, {
          credentials: "include",
        });
        if (!statusRes.ok) throw new Error("Failed to poll scan status");
        const status = await statusRes.json();
        if (status.status === "completed" && status.result)
          return status.result as ScanWithPurchase;
        if (status.status === "failed")
          throw new Error(status.error || "Scan failed");
      }
      throw new Error("Scan timed out");
    }

    return res.json() as Promise<ScanWithPurchase>;
  };

  const handleCompetitorAnalysis = async () => {
    if (!competitorUrl.trim() || !myUrlForCompare.trim()) return;

    setIsAnalyzingCompetitor(true);
    setCompetitorError(null);

    try {
      const [dataA, dataB] = await Promise.all([
        scanUrlForComparison(myUrlForCompare.trim()),
        scanUrlForComparison(competitorUrl.trim()),
      ]);

      if (!dataA?.url) {
        setCompetitorError("Invalid response from your website scan");
        return;
      }
      if (!dataB?.url) {
        setCompetitorError("Invalid response from competitor website scan");
        return;
      }

      setComparisonOldScan(dataA);
      setComparisonNewScan(dataB);
      setComparisonLabels(["My Site", "Competitor"]);
      setShowComparison(true);
      setShowCompetitorDialog(false);
      setCompetitorUrl("");
      setMyUrlForCompare("");
      setCompetitorError(null);

      void fetchScans();
    } catch (error) {
      console.error("Comparison failed", error);
      setCompetitorError(
        error instanceof Error
          ? error.message
          : "Failed to compare websites. Please try again."
      );
    } finally {
      setIsAnalyzingCompetitor(false);
    }
  };

  const cancelComparison = () => {
    setComparisonMode(false);
    setSelectedScanForComparison(null);
  };

  const getScansForUrl = (url: string) => {
    const urlScans = scans
      .filter((s) => s.url === url)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    return hasActiveSubscription
      ? urlScans.map((scan) => ({ ...scan, isPurchased: true }))
      : urlScans;
  };

  const handleQuickCompare = (scan: ScanWithPurchase) => {
    const urlScans = getScansForUrl(scan.url);
    if (urlScans.length >= 2) {
      const latest = urlScans[0];
      const previous = urlScans[1];
      setComparisonOldScan(previous);
      setComparisonNewScan(latest);
      setComparisonLabels(["Previous Scan", "Current Scan"]);
      setShowComparison(true);
    }
  };

  const handleToggleTagFilter = async (tag: string) => {
    const newSelectedTags = selectedTags.includes(tag)
      ? selectedTags.filter((t) => t !== tag)
      : [...selectedTags, tag];
    setSelectedTags(newSelectedTags);
    setLoading(true);
    await fetchScans(newSelectedTags.length > 0 ? newSelectedTags : undefined);
    setLoading(false);
  };

  const handleClearTagFilter = async () => {
    setSelectedTags([]);
    setLoading(true);
    await fetchScans();
    setLoading(false);
  };

  const handleAddTag = async (scanId: number, tag: string) => {
    if (!tag.trim()) return;

    const scan = scans.find((s) => s.id === scanId);
    if (!scan) return;

    const updatedTags = [...(scan.tags || []), tag.trim()];

    try {
      const response = await fetch(`/api/scans/${scanId}/tags`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags: updatedTags }),
        credentials: "include",
      });

      if (response.ok) {
        await fetchScans(selectedTags.length > 0 ? selectedTags : undefined);
        await fetchAllTags();
      }
    } catch (error) {
      console.error("Failed to add tag:", error);
    }
  };

  const handleRemoveTag = async (scanId: number, tagToRemove: string) => {
    const scan = scans.find((s) => s.id === scanId);
    if (!scan) return;

    const updatedTags = (scan.tags || []).filter((t) => t !== tagToRemove);

    try {
      const response = await fetch(`/api/scans/${scanId}/tags`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags: updatedTags }),
        credentials: "include",
      });

      if (response.ok) {
        await fetchScans(selectedTags.length > 0 ? selectedTags : undefined);
        await fetchAllTags();
      }
    } catch (error) {
      console.error("Failed to remove tag:", error);
    }
  };

  const handleScanComplete = useCallback(() => {
    void fetchScans();
  }, [fetchScans]);

  const onRecurringScansChange = useCallback((list: RecurringScan[]) => {
    setRecurringScans(list);
  }, []);

  const openPreferences = useCallback((scan: RecurringScan) => {
    void settingsPanelRef.current?.openPreferences(scan);
  }, []);

  return {
    user,
    settingsPanelRef,
    runTour,
    isAgencyView,
    recurringScans,
    scans,
    loading,
    allTags,
    selectedTags,
    showTagFilter,
    setShowTagFilter,
    comparisonMode,
    selectedScanForComparison,
    expandedScan,
    setExpandedScan,
    hasActiveSubscription,
    fetchScans,
    fetchAllTags,
    handleUnlock,
    handlePaymentSuccess,
    downloadFile,
    testBotAccess,
    botAccessTests,
    testingBots,
    handleCompareScans,
    cancelComparison,
    getScansForUrl,
    handleQuickCompare,
    handleToggleTagFilter,
    handleClearTagFilter,
    handleAddTag,
    handleRemoveTag,
    handleScanComplete,
    onRecurringScansChange,
    openPreferences,
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
  };
}
