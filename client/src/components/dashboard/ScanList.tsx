import { useState } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  Globe,
  Calendar,
  Tag,
  Bot,
  CheckCircle2,
  AlertCircle,
  GitCompare,
  Filter,
  Plus,
  X,
  Download,
  Lock,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { Scan } from "@shared/schema";

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
  const [editingTagsForScan, setEditingTagsForScan] = useState<number | null>(null);
  const [tagInput, setTagInput] = useState("");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (scans.length === 0) {
    return (
      <Card className="p-12 text-center bg-card border-white/5">
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
          <span className="text-sm text-muted-foreground">{scans.length} {scans.length === 1 ? 'scan' : 'scans'}</span>
        </div>
      </div>

      {/* Tag Filter */}
      {showTagFilter && allTags.length > 0 && (
        <Card className="p-4 mb-4 bg-card border-white/5">
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
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background border-white/10 hover:bg-primary/20'
                }`}
                data-testid={`tag-filter-${tag}`}
              >
                {tag}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      {comparisonMode && selectedScanForComparison && (
        <Card className="p-4 bg-primary/10 border-primary/30 mb-4">
          <div className="flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-primary" />
            <p className="text-sm">
              <span className="font-semibold">Comparison Mode:</span> Select another scan of <span className="font-mono">{selectedScanForComparison.url}</span> to compare
            </p>
          </div>
        </Card>
      )}

      <div className="space-y-4">
        {scans.map((scan) => {
          const urlScans = getScansForUrl(scan.url);
          const canQuickCompare = urlScans.length >= 2;
          const isLatestForUrl = urlScans[0]?.id === scan.id;
          const isSelectedForComparison = selectedScanForComparison?.id === scan.id;

          return (
            <Card
              key={scan.id}
              className="p-6 bg-card border-white/5 hover:border-primary/20 card-hover"
              data-testid={`scan-card-${scan.id}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-3">
                    <Globe className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-bold font-mono">{scan.url}</h3>
                    {scan.isPurchased && (
                      <span className="px-2 py-1 bg-primary/20 border border-primary/30 rounded-full text-xs font-semibold text-primary flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Premium
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(scan.createdAt).toLocaleDateString()}
                    </span>
                    <span className={scan.robotsTxtFound ? "text-green-400" : "text-yellow-400"}>
                      {scan.robotsTxtFound ? "✓ robots.txt found" : "⚠ robots.txt missing"}
                    </span>
                    <span className={scan.llmsTxtFound ? "text-green-400" : "text-red-400"}>
                      {scan.llmsTxtFound ? "✓ llms.txt found" : "✗ llms.txt missing"}
                    </span>
                  </div>

                  {/* Tags */}
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Tag className="w-4 h-4 text-primary" />
                      <span className="text-sm font-semibold">Tags</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {scan.tags && scan.tags.length > 0 ? (
                        scan.tags.map((tag) => (
                          <Badge
                            key={tag}
                            className="bg-primary/20 border-primary/30 group cursor-pointer hover:bg-red-500/20 hover:border-red-500/30"
                            onClick={() => onRemoveTag(scan.id, tag)}
                            data-testid={`tag-${scan.id}-${tag}`}
                          >
                            {tag}
                            <X className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">No tags</span>
                      )}
                      {editingTagsForScan === scan.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                onAddTag(scan.id, tagInput);
                                setEditingTagsForScan(null);
                                setTagInput("");
                              } else if (e.key === 'Escape') {
                                setEditingTagsForScan(null);
                                setTagInput("");
                              }
                            }}
                            placeholder="Enter tag name"
                            className="h-6 text-xs w-32"
                            autoFocus
                            data-testid={`input-tag-${scan.id}`}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2"
                            onClick={() => {
                              onAddTag(scan.id, tagInput);
                              setEditingTagsForScan(null);
                              setTagInput("");
                            }}
                            data-testid={`button-save-tag-${scan.id}`}
                          >
                            Add
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2"
                            onClick={() => {
                              setEditingTagsForScan(null);
                              setTagInput("");
                            }}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 px-2 text-xs border-dashed"
                          onClick={() => setEditingTagsForScan(scan.id)}
                          data-testid={`button-add-tag-${scan.id}`}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Add Tag
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Bot Permissions Preview */}
                  {scan.botPermissions && Object.keys(scan.botPermissions).length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <Bot className="w-4 h-4 text-primary" />
                        AI Bot Permissions
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {Object.entries(scan.botPermissions as Record<string, string>).slice(0, 6).map(([bot, permission]) => {
                          const testKey = `${scan.url}-${bot}`;
                          const testResult = botAccessTests[testKey];
                          const isTesting = testingBots.has(testKey);

                          return (
                            <div
                              key={bot}
                              className="flex flex-col gap-2 p-2 bg-background/50 border border-white/5 rounded text-xs"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                    permission.toLowerCase().includes('allow') || permission.toLowerCase().includes('yes')
                                      ? 'bg-green-400'
                                      : permission.toLowerCase().includes('disallow') || permission.toLowerCase().includes('no')
                                      ? 'bg-red-400'
                                      : 'bg-yellow-400'
                                  }`} />
                                  <span className="font-mono truncate">{bot}</span>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-6 px-2 text-xs flex-shrink-0"
                                  onClick={() => onTestBotAccess(scan.url, bot)}
                                  disabled={isTesting}
                                  data-testid={`button-test-bot-${scan.id}-${bot}`}
                                >
                                  {isTesting ? 'Testing...' : 'Test'}
                                </Button>
                              </div>
                              {testResult && (
                                <div className="flex items-center gap-2 text-xs">
                                  <Badge
                                    variant={testResult.accessible ? "default" : "destructive"}
                                    className={`text-xs ${
                                      testResult.accessible
                                        ? 'bg-green-500/20 text-green-400 border-green-500/30'
                                        : testResult.status === 403
                                        ? 'bg-red-500/20 text-red-400 border-red-500/30'
                                        : testResult.status === 406
                                        ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                                        : 'bg-red-500/20 text-red-400 border-red-500/30'
                                    }`}
                                  >
                                    {testResult.status} {testResult.statusText}
                                  </Badge>
                                  {testResult.accessible ? (
                                    <span className="text-green-400 text-xs">Truly Accessible</span>
                                  ) : testResult.status === 403 ? (
                                    <span className="text-red-400 text-xs">Blocked by Firewall</span>
                                  ) : testResult.status === 406 ? (
                                    <span className="text-yellow-400 text-xs">Server Rejected Headers</span>
                                  ) : (
                                    <span className="text-red-400 text-xs">Not Accessible</span>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {Object.keys(scan.botPermissions as Record<string, string>).length > 6 && (
                          <div className="flex items-center gap-2 p-2 bg-primary/10 border border-primary/20 rounded text-xs text-primary font-semibold">
                            +{Object.keys(scan.botPermissions as Record<string, string>).length - 6} more
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {scan.isPurchased ? (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedScan(expandedScan === scan.id ? null : scan.id)}
                        className="mb-3"
                        data-testid={`button-toggle-${scan.id}`}
                      >
                        {expandedScan === scan.id ? "Hide Details" : "Show Details"}
                      </Button>

                      {expandedScan === scan.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-4 space-y-4 min-w-0"
                        >
                          {scan.robotsTxtContent && (
                            <div className="min-w-0">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-semibold text-sm">robots.txt</h4>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => downloadFile(scan.robotsTxtContent!, 'robots.txt')}
                                  data-testid={`button-download-robots-${scan.id}`}
                                >
                                  <Download className="w-3 h-3 mr-2" />
                                  Download
                                </Button>
                              </div>
                              <pre className="p-4 bg-black/40 border border-white/10 rounded-lg text-xs overflow-auto max-h-64 break-words whitespace-pre-wrap">
                                {scan.robotsTxtContent}
                              </pre>
                            </div>
                          )}

                          {scan.llmsTxtContent && (
                            <div className="min-w-0">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-semibold text-sm">llms.txt</h4>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => downloadFile(scan.llmsTxtContent!, 'llms.txt')}
                                  data-testid={`button-download-llms-${scan.id}`}
                                >
                                  <Download className="w-3 h-3 mr-2" />
                                  Download
                                </Button>
                              </div>
                              <pre className="p-4 bg-black/40 border border-white/10 rounded-lg text-xs overflow-auto max-h-64 break-words whitespace-pre-wrap">
                                {scan.llmsTxtContent}
                              </pre>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </>
                  ) : (
                    <div className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/30 rounded-lg">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-primary/20 rounded-lg">
                          <Lock className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-lg mb-2 flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-primary" />
                            Premium Optimization Report
                          </h4>
                          <p className="text-sm text-muted-foreground mb-4">
                            Unlock comprehensive insights and downloadable files:
                          </p>
                          <div className="grid gap-2 mb-4">
                            <div className="flex items-center gap-2 text-sm">
                              <CheckCircle2 className="w-4 h-4 text-green-400" />
                              <span>Full <span className="font-semibold font-mono">robots.txt</span> content with validation</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <CheckCircle2 className="w-4 h-4 text-green-400" />
                              <span>Complete <span className="font-semibold font-mono">llms.txt</span> file analysis</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <CheckCircle2 className="w-4 h-4 text-green-400" />
                              <span>Detailed bot permissions breakdown</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <CheckCircle2 className="w-4 h-4 text-green-400" />
                              <span>Downloadable optimization recommendations</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <CheckCircle2 className="w-4 h-4 text-green-400" />
                              <span>Ready-to-use configuration files</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Button
                              onClick={() => onUnlock(scan)}
                              className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold btn-hover-glow btn-hover-lift"
                              data-testid={`button-unlock-${scan.id}`}
                            >
                              <Sparkles className="w-4 h-4 mr-2" />
                              Unlock for $9.99
                            </Button>
                            <span className="text-xs text-muted-foreground">One-time payment • Instant access</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {scan.isPurchased && (
                  <div className="flex-shrink-0">
                    <CheckCircle2 className="w-8 h-8 text-primary" />
                  </div>
                )}
              </div>

              {(scan.errors && scan.errors.length > 0 || scan.warnings && scan.warnings.length > 0) && (
                <div className="mt-4 space-y-2">
                  {scan.errors && scan.errors.map((error, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-red-400">
                      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                  ))}
                  {scan.warnings && scan.warnings.map((warning, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-yellow-400">
                      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>{warning}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Comparison Actions */}
              <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {canQuickCompare && isLatestForUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onQuickCompare(scan)}
                      className="border-primary/30 btn-hover-lift group"
                      data-testid={`button-quick-compare-${scan.id}`}
                    >
                      <GitCompare className="w-4 h-4 mr-2 group-hover:text-primary transition-colors" />
                      Compare with Previous
                    </Button>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onCompareScans(scan)}
                  disabled={comparisonMode && selectedScanForComparison?.url !== scan.url}
                  className={`btn-hover-scale ${isSelectedForComparison ? "bg-primary/20 border border-primary/30" : ""}`}
                  data-testid={`button-compare-${scan.id}`}
                >
                  <GitCompare className="w-4 h-4 mr-2" />
                  {isSelectedForComparison ? 'Selected' : 'Select to Compare'}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}
