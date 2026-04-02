import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { ScanWithPurchase } from "@/components/dashboard/ScanList";
import { queryKeys } from "@/lib/queryKeys";
import { runScanToCompletion } from "@/lib/scan-client";

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
      const result = await runScanToCompletion({ url }, { async: true });
      return result as ScanWithPurchase;
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
