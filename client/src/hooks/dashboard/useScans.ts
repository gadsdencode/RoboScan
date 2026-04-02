import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ScanWithPurchase } from "@/components/dashboard/ScanList";
import {
  fetchUserScans,
  fetchUserTags,
  patchScanTags,
} from "@/lib/api/dashboard";
import { queryKeys } from "@/lib/queryKeys";

export function useScans(hasActiveSubscription: boolean) {
  const queryClient = useQueryClient();
  const [expandedScan, setExpandedScan] = useState<number | null>(null);

  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showTagFilter, setShowTagFilter] = useState(false);

  const tagFilterForQuery = useMemo(
    () => (selectedTags.length > 0 ? selectedTags : undefined),
    [selectedTags]
  );

  const scansQuery = useQuery({
    queryKey: queryKeys.userScans.list(tagFilterForQuery),
    queryFn: () => fetchUserScans(tagFilterForQuery),
    placeholderData: (previousData) => previousData,
  });

  const tagsQuery = useQuery({
    queryKey: queryKeys.userTags,
    queryFn: fetchUserTags,
  });

  const updateTagsMutation = useMutation({
    mutationFn: ({
      scanId,
      tags,
    }: {
      scanId: number;
      tags: string[];
    }) => patchScanTags(scanId, tags),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.userScans.root });
      void queryClient.invalidateQueries({ queryKey: queryKeys.userTags });
    },
  });

  const scans = scansQuery.data ?? [];
  const loading = scansQuery.isLoading;
  const allTags = tagsQuery.data ?? [];

  const fetchScans = useCallback(() => {
    return queryClient.invalidateQueries({ queryKey: queryKeys.userScans.root });
  }, [queryClient]);

  const fetchAllTags = useCallback(() => {
    return queryClient.invalidateQueries({ queryKey: queryKeys.userTags });
  }, [queryClient]);

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
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleClearTagFilter = async () => {
    setSelectedTags([]);
  };

  const handleAddTag = async (scanId: number, tag: string) => {
    if (!tag.trim()) return;

    const scan = scans.find((s) => s.id === scanId);
    if (!scan) return;

    const updatedTags = [...(scan.tags || []), tag.trim()];
    await updateTagsMutation.mutateAsync({ scanId, tags: updatedTags });
  };

  const handleRemoveTag = async (scanId: number, tagToRemove: string) => {
    const scan = scans.find((s) => s.id === scanId);
    if (!scan) return;

    const updatedTags = (scan.tags || []).filter((t) => t !== tagToRemove);
    await updateTagsMutation.mutateAsync({ scanId, tags: updatedTags });
  };

  const handleScanComplete = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.userScans.root });
  }, [queryClient]);

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
