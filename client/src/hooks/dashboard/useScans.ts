import { useCallback, useEffect, useState } from "react";
import type { ScanWithPurchase } from "@/components/dashboard/ScanList";

export function useScans(hasActiveSubscription: boolean) {
  const [scans, setScans] = useState<ScanWithPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedScan, setExpandedScan] = useState<number | null>(null);

  const [allTags, setAllTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showTagFilter, setShowTagFilter] = useState(false);

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

  useEffect(() => {
    void fetchScans();
    void fetchAllTags();
  }, [fetchScans, fetchAllTags]);

  const getScansForUrl = useCallback(
    (url: string) => {
      const urlScans = scans
        .filter((s) => s.url === url)
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      return hasActiveSubscription
        ? urlScans.map((scan) => ({ ...scan, isPurchased: true }))
        : urlScans;
    },
    [scans, hasActiveSubscription]
  );

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

  return {
    scans,
    loading,
    expandedScan,
    setExpandedScan,
    allTags,
    selectedTags,
    showTagFilter,
    setShowTagFilter,
    fetchScans,
    fetchAllTags,
    getScansForUrl,
    handleToggleTagFilter,
    handleClearTagFilter,
    handleAddTag,
    handleRemoveTag,
    handleScanComplete,
  };
}
