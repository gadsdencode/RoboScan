// client/src/components/dashboard/ScanList.tsx
import {
  FileText,
  Filter,
  Tag,
  GitCompare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Scan } from "@shared/schema";
import { ScanCard } from "./ScanCard";

export interface ScanWithPurchase extends Scan {
  isPurchased: boolean;
}

interface ScanListProps {
  loading: boolean;
  scans: ScanWithPurchase[];
  allTags: string[];
  selectedTags: string[];
  showTagFilter: boolean;
  setShowTagFilter: (show: boolean) => void;
  comparisonMode: boolean;
  selectedScanForComparison: ScanWithPurchase | null;
  onToggleTagFilter: (tag: string) => Promise<void>;
  onClearTagFilter: () => Promise<void>;
  onCancelComparison: () => void;
  getScansForUrl: (url: string) => ScanWithPurchase[];
  onQuickCompare: (scan: ScanWithPurchase) => void;
  onCompareScans: (scan: ScanWithPurchase) => void;
  onUnlock: (scan: ScanWithPurchase) => void;
  onAddTag: (scanId: number, tag: string) => Promise<void>;
  onRemoveTag: (scanId: number, tag: string) => Promise<void>;
  downloadFile: (content: string, filename: string) => void;
  botAccessTests: Record<string, { status: number; accessible: boolean; statusText: string; loading?: boolean }>;
  testingBots: Set<string>;
  onTestBotAccess: (scanUrl: string, botName: string) => Promise<void>;
  expandedScan: number | null;
  setExpandedScan: (id: number | null) => void;
}

/**
 * ScanList - Renders a filterable list of scan cards.
 * 
 * Responsibilities:
 * - Loading and empty states
 * - Tag filtering UI
 * - Comparison mode UI
 * - Orchestrating ScanCard rendering
 * 
 * Individual card rendering is delegated to ScanCard component.
 */
export function ScanList({
  loading,
  scans,
  allTags,
  selectedTags,
  showTagFilter,
  setShowTagFilter,
  comparisonMode,
  selectedScanForComparison,
  onToggleTagFilter,
  onClearTagFilter,
  onCancelComparison,
  getScansForUrl,
  onQuickCompare,
  onCompareScans,
  onUnlock,
  onAddTag,
  onRemoveTag,
  downloadFile,
  botAccessTests,
  testingBots,
  onTestBotAccess,
  expandedScan,
  setExpandedScan,
}: ScanListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (scans.length === 0) {
    return (
      <Card className="p-12 text-center bg-card border border-border">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/20 rounded-full mb-4">
          <FileText className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-xl font-bold mb-2">No scans yet</h3>
        <p className="text-muted-foreground">
          Use the scan input above to analyze your first website
        </p>
      </Card>
    );
  }

  return (
    <>
      {/* Header with filters and count */}
      <ScanListHeader
        scansCount={scans.length}
        allTags={allTags}
        selectedTags={selectedTags}
        showTagFilter={showTagFilter}
        setShowTagFilter={setShowTagFilter}
        comparisonMode={comparisonMode}
        onCancelComparison={onCancelComparison}
      />

      {/* Tag Filter Panel */}
      <TagFilterPanel
        showTagFilter={showTagFilter}
        allTags={allTags}
        selectedTags={selectedTags}
        onToggleTagFilter={onToggleTagFilter}
        onClearTagFilter={onClearTagFilter}
      />

      {/* Comparison Mode Banner */}
      <ComparisonModeBanner
        comparisonMode={comparisonMode}
        selectedScanForComparison={selectedScanForComparison}
      />

      {/* Scan Cards */}
      <div className="space-y-4">
        {scans.map((scan) => {
          const urlScans = getScansForUrl(scan.url);
          const canQuickCompare = urlScans.length >= 2;
          const isLatestForUrl = urlScans[0]?.id === scan.id;
          const isSelectedForComparison = selectedScanForComparison?.id === scan.id;

          return (
            <ScanCard
              key={scan.id}
              scan={scan}
              canQuickCompare={canQuickCompare}
              isLatestForUrl={isLatestForUrl}
              isSelectedForComparison={isSelectedForComparison}
              comparisonMode={comparisonMode}
              selectedComparisonUrl={selectedScanForComparison?.url}
              botAccessTests={botAccessTests}
              testingBots={testingBots}
              isExpanded={expandedScan === scan.id}
              onExpand={setExpandedScan}
              onUnlock={onUnlock}
              onAddTag={onAddTag}
              onRemoveTag={onRemoveTag}
              onTestBotAccess={onTestBotAccess}
              onQuickCompare={onQuickCompare}
              onCompareScans={onCompareScans}
              downloadFile={downloadFile}
            />
          );
        })}
      </div>
    </>
  );
}

// ============================================================================
// Sub-components for ScanList
// ============================================================================

interface ScanListHeaderProps {
  scansCount: number;
  allTags: string[];
  selectedTags: string[];
  showTagFilter: boolean;
  setShowTagFilter: (show: boolean) => void;
  comparisonMode: boolean;
  onCancelComparison: () => void;
}

function ScanListHeader({
  scansCount,
  allTags,
  selectedTags,
  showTagFilter,
  setShowTagFilter,
  comparisonMode,
  onCancelComparison,
}: ScanListHeaderProps) {
  return (
    <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
      <h2 className="text-xl font-bold">Your Scans</h2>
      <div className="flex items-center gap-3 flex-wrap">
        {allTags.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTagFilter(!showTagFilter)}
            className="border-primary/30"
            data-testid="button-toggle-tag-filter"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filter by Tags
            {selectedTags.length > 0 && (
              <Badge className="ml-2 bg-primary">{selectedTags.length}</Badge>
            )}
          </Button>
        )}
        {comparisonMode && (
          <Button
            variant="outline"
            size="sm"
            onClick={onCancelComparison}
            data-testid="button-cancel-comparison"
          >
            Cancel Comparison
          </Button>
        )}
        <span className="text-sm text-muted-foreground">
          {scansCount} {scansCount === 1 ? "scan" : "scans"}
        </span>
      </div>
    </div>
  );
}

interface TagFilterPanelProps {
  showTagFilter: boolean;
  allTags: string[];
  selectedTags: string[];
  onToggleTagFilter: (tag: string) => Promise<void>;
  onClearTagFilter: () => Promise<void>;
}

function TagFilterPanel({
  showTagFilter,
  allTags,
  selectedTags,
  onToggleTagFilter,
  onClearTagFilter,
}: TagFilterPanelProps) {
  if (!showTagFilter || allTags.length === 0) return null;

  return (
    <Card className="p-4 mb-4 bg-card border border-border">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Tag className="w-4 h-4 text-primary" />
          Filter by Tags
        </h3>
        {selectedTags.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearTagFilter}
            data-testid="button-clear-tag-filter"
          >
            Clear All
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {allTags.map((tag) => (
          <Badge
            key={tag}
            onClick={() => onToggleTagFilter(tag)}
            className={`cursor-pointer transition-all ${
              selectedTags.includes(tag)
                ? "bg-primary text-primary-foreground"
                : "bg-background border-border hover:bg-primary/20"
            }`}
            data-testid={`tag-filter-${tag}`}
          >
            {tag}
          </Badge>
        ))}
      </div>
    </Card>
  );
}

interface ComparisonModeBannerProps {
  comparisonMode: boolean;
  selectedScanForComparison: ScanWithPurchase | null;
}

function ComparisonModeBanner({
  comparisonMode,
  selectedScanForComparison,
}: ComparisonModeBannerProps) {
  if (!comparisonMode || !selectedScanForComparison) return null;

  return (
    <Card className="p-4 bg-primary/10 border-primary/30 mb-4">
      <div className="flex items-center gap-2">
        <GitCompare className="w-5 h-5 text-primary" />
        <p className="text-sm">
          <span className="font-semibold">Comparison Mode:</span> Select another scan of{" "}
          <span className="font-mono">{selectedScanForComparison.url}</span> to compare
        </p>
      </div>
    </Card>
  );
}
