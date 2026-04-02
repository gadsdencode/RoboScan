import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { ScanWithPurchase } from "@/components/dashboard/ScanList";
import { queryKeys } from "@/lib/queryKeys";

export interface UseComparisonOptions {
  getScansForUrl: (url: string) => ScanWithPurchase[];
}

export function useComparison({ getScansForUrl }: UseComparisonOptions) {
  const queryClient = useQueryClient();
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

  const scanUrlForComparison = useCallback(
    async (url: string): Promise<ScanWithPurchase> => {
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
    },
    []
  );

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

  const cancelComparison = () => {
    setComparisonMode(false);
    setSelectedScanForComparison(null);
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

      void queryClient.invalidateQueries({ queryKey: queryKeys.userScans.root });
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

  return {
    comparisonMode,
    selectedScanForComparison,
    showComparison,
    setShowComparison,
    comparisonOldScan,
    comparisonNewScan,
    comparisonLabels,
    setComparisonOldScan,
    setComparisonNewScan,
    handleCompareScans,
    cancelComparison,
    handleQuickCompare,
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
