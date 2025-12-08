// client/src/components/dashboard/ScanCard.tsx
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Globe,
  Calendar,
  Tag,
  Bot,
  CheckCircle2,
  AlertCircle,
  GitCompare,
  Plus,
  X,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PremiumUnlockCard } from "./PremiumUnlockCard";
import type { ScanWithPurchase } from "./ScanList";

interface BotTestResult {
  status: number;
  accessible: boolean;
  statusText: string;
  loading?: boolean;
}

export interface ScanCardProps {
  scan: ScanWithPurchase;
  /** Whether this scan can be quick-compared (has multiple scans for same URL) */
  canQuickCompare: boolean;
  /** Whether this is the latest scan for the URL */
  isLatestForUrl: boolean;
  /** Whether this scan is currently selected for comparison */
  isSelectedForComparison: boolean;
  /** Whether comparison mode is active */
  comparisonMode: boolean;
  /** The URL of the scan selected for comparison (if any) */
  selectedComparisonUrl?: string;
  /** Bot access test results keyed by "url-botName" */
  botAccessTests: Record<string, BotTestResult>;
  /** Set of bot tests currently in progress */
  testingBots: Set<string>;
  /** Whether this scan's details are expanded */
  isExpanded: boolean;
  // Callbacks
  onExpand: (id: number | null) => void;
  onUnlock: (scan: ScanWithPurchase) => void;
  onAddTag: (scanId: number, tag: string) => Promise<void>;
  onRemoveTag: (scanId: number, tag: string) => Promise<void>;
  onTestBotAccess: (scanUrl: string, botName: string) => Promise<void>;
  onQuickCompare: (scan: ScanWithPurchase) => void;
  onCompareScans: (scan: ScanWithPurchase) => void;
  downloadFile: (content: string, filename: string) => void;
}

/**
 * ScanCard - Renders an individual scan result card.
 * 
 * Extracted from ScanList to:
 * - Improve maintainability and readability
 * - Enable isolated testing of card logic
 * - Allow easier A/B testing of unlock UI via PremiumUnlockCard
 */
export function ScanCard({
  scan,
  canQuickCompare,
  isLatestForUrl,
  isSelectedForComparison,
  comparisonMode,
  selectedComparisonUrl,
  botAccessTests,
  testingBots,
  isExpanded,
  onExpand,
  onUnlock,
  onAddTag,
  onRemoveTag,
  onTestBotAccess,
  onQuickCompare,
  onCompareScans,
  downloadFile,
}: ScanCardProps) {
  const [editingTags, setEditingTags] = useState(false);
  const [tagInput, setTagInput] = useState("");

  const handleAddTag = async () => {
    if (tagInput.trim()) {
      await onAddTag(scan.id, tagInput.trim());
    }
    setEditingTags(false);
    setTagInput("");
  };

  const handleCancelTagEdit = () => {
    setEditingTags(false);
    setTagInput("");
  };

  return (
    <Card
      className="p-6 bg-card border border-border hover:border-primary/50 card-hover"
      data-testid={`scan-card-${scan.id}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Header: URL and Premium Badge */}
          <ScanCardHeader scan={scan} />

          {/* Metadata: Date and file status indicators */}
          <ScanCardMetadata scan={scan} />

          {/* Tags Section */}
          <TagsSection
            scan={scan}
            editingTags={editingTags}
            tagInput={tagInput}
            setTagInput={setTagInput}
            setEditingTags={setEditingTags}
            onAddTag={handleAddTag}
            onRemoveTag={onRemoveTag}
            onCancelTagEdit={handleCancelTagEdit}
          />

          {/* Bot Permissions Preview */}
          <BotPermissionsSection
            scan={scan}
            botAccessTests={botAccessTests}
            testingBots={testingBots}
            onTestBotAccess={onTestBotAccess}
          />

          {/* Premium Content: Show details OR unlock card */}
          {scan.isPurchased ? (
            <PurchasedContent
              scan={scan}
              isExpanded={isExpanded}
              onExpand={onExpand}
              downloadFile={downloadFile}
            />
          ) : (
            <PremiumUnlockCard scan={scan} onUnlock={onUnlock} />
          )}
        </div>

        {/* Premium checkmark indicator */}
        {scan.isPurchased && (
          <div className="flex-shrink-0">
            <CheckCircle2 className="w-8 h-8 text-primary" />
          </div>
        )}
      </div>

      {/* Errors and Warnings */}
      <ErrorsAndWarnings scan={scan} />

      {/* Comparison Actions */}
      <ComparisonActions
        scan={scan}
        canQuickCompare={canQuickCompare}
        isLatestForUrl={isLatestForUrl}
        isSelectedForComparison={isSelectedForComparison}
        comparisonMode={comparisonMode}
        selectedComparisonUrl={selectedComparisonUrl}
        onQuickCompare={onQuickCompare}
        onCompareScans={onCompareScans}
      />
    </Card>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function ScanCardHeader({ scan }: { scan: ScanWithPurchase }) {
  return (
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
  );
}

function ScanCardMetadata({ scan }: { scan: ScanWithPurchase }) {
  return (
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
  );
}

interface TagsSectionProps {
  scan: ScanWithPurchase;
  editingTags: boolean;
  tagInput: string;
  setTagInput: (value: string) => void;
  setEditingTags: (value: boolean) => void;
  onAddTag: () => void;
  onRemoveTag: (scanId: number, tag: string) => Promise<void>;
  onCancelTagEdit: () => void;
}

function TagsSection({
  scan,
  editingTags,
  tagInput,
  setTagInput,
  setEditingTags,
  onAddTag,
  onRemoveTag,
  onCancelTagEdit,
}: TagsSectionProps) {
  return (
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
        {editingTags ? (
          <div className="flex items-center gap-2">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onAddTag();
                else if (e.key === "Escape") onCancelTagEdit();
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
              onClick={onAddTag}
              data-testid={`button-save-tag-${scan.id}`}
            >
              Add
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2"
              onClick={onCancelTagEdit}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="h-6 px-2 text-xs border-dashed"
            onClick={() => setEditingTags(true)}
            data-testid={`button-add-tag-${scan.id}`}
          >
            <Plus className="w-3 h-3 mr-1" />
            Add Tag
          </Button>
        )}
      </div>
    </div>
  );
}

interface BotPermissionsSectionProps {
  scan: ScanWithPurchase;
  botAccessTests: Record<string, BotTestResult>;
  testingBots: Set<string>;
  onTestBotAccess: (scanUrl: string, botName: string) => Promise<void>;
}

function BotPermissionsSection({
  scan,
  botAccessTests,
  testingBots,
  onTestBotAccess,
}: BotPermissionsSectionProps) {
  if (!scan.botPermissions || Object.keys(scan.botPermissions).length === 0) {
    return null;
  }

  const permissions = scan.botPermissions as Record<string, string>;
  const displayedBots = Object.entries(permissions).slice(0, 6);
  const remainingCount = Object.keys(permissions).length - 6;

  return (
    <div className="mb-4">
      <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
        <Bot className="w-4 h-4 text-primary" />
        AI Bot Permissions
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {displayedBots.map(([bot, permission]) => {
          const testKey = `${scan.url}-${bot}`;
          const testResult = botAccessTests[testKey];
          const isTesting = testingBots.has(testKey);

          return (
            <BotPermissionItem
              key={bot}
              scanId={scan.id}
              scanUrl={scan.url}
              bot={bot}
              permission={permission}
              testResult={testResult}
              isTesting={isTesting}
              onTestBotAccess={onTestBotAccess}
            />
          );
        })}
        {remainingCount > 0 && (
          <div className="flex items-center gap-2 p-2 bg-primary/10 border border-primary/20 rounded text-xs text-primary font-semibold">
            +{remainingCount} more
          </div>
        )}
      </div>
    </div>
  );
}

interface BotPermissionItemProps {
  scanId: number;
  scanUrl: string;
  bot: string;
  permission: string;
  testResult?: BotTestResult;
  isTesting: boolean;
  onTestBotAccess: (scanUrl: string, botName: string) => Promise<void>;
}

function BotPermissionItem({
  scanId,
  scanUrl,
  bot,
  permission,
  testResult,
  isTesting,
  onTestBotAccess,
}: BotPermissionItemProps) {
  const getPermissionColor = () => {
    const lowerPermission = permission.toLowerCase();
    if (lowerPermission.includes("allow") || lowerPermission.includes("yes")) {
      return "bg-green-400";
    }
    if (lowerPermission.includes("disallow") || lowerPermission.includes("no")) {
      return "bg-red-400";
    }
    return "bg-yellow-400";
  };

  const getTestResultBadgeClass = () => {
    if (!testResult) return "";
    if (testResult.accessible) return "bg-green-500/20 text-green-400 border-green-500/30";
    if (testResult.status === 403) return "bg-red-500/20 text-red-400 border-red-500/30";
    if (testResult.status === 406) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    return "bg-red-500/20 text-red-400 border-red-500/30";
  };

  const getTestResultMessage = () => {
    if (!testResult) return null;
    if (testResult.accessible) return "Truly Accessible";
    if (testResult.status === 403) return "Blocked by Firewall";
    if (testResult.status === 406) return "Server Rejected Headers";
    return "Not Accessible";
  };

  return (
    <div className="flex flex-col gap-2 p-2 bg-background border border-border rounded text-xs">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getPermissionColor()}`} />
          <span className="font-mono truncate">{bot}</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-6 px-2 text-xs flex-shrink-0"
          onClick={() => onTestBotAccess(scanUrl, bot)}
          disabled={isTesting}
          data-testid={`button-test-bot-${scanId}-${bot}`}
        >
          {isTesting ? "Testing..." : "Test"}
        </Button>
      </div>
      {testResult && (
        <div className="flex items-center gap-2 text-xs">
          <Badge
            variant={testResult.accessible ? "default" : "destructive"}
            className={`text-xs ${getTestResultBadgeClass()}`}
          >
            {testResult.status} {testResult.statusText}
          </Badge>
          <span className={testResult.accessible ? "text-green-400" : testResult.status === 406 ? "text-yellow-400" : "text-red-400"}>
            {getTestResultMessage()}
          </span>
        </div>
      )}
    </div>
  );
}

interface PurchasedContentProps {
  scan: ScanWithPurchase;
  isExpanded: boolean;
  onExpand: (id: number | null) => void;
  downloadFile: (content: string, filename: string) => void;
}

function PurchasedContent({ scan, isExpanded, onExpand, downloadFile }: PurchasedContentProps) {
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onExpand(isExpanded ? null : scan.id)}
        className="mb-3"
        data-testid={`button-toggle-${scan.id}`}
      >
        {isExpanded ? "Hide Details" : "Show Details"}
      </Button>

      {isExpanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-4 space-y-4 min-w-0"
        >
          {scan.robotsTxtContent && (
            <FileContentSection
              title="robots.txt"
              content={scan.robotsTxtContent}
              filename="robots.txt"
              scanId={scan.id}
              downloadFile={downloadFile}
            />
          )}
          {scan.llmsTxtContent && (
            <FileContentSection
              title="llms.txt"
              content={scan.llmsTxtContent}
              filename="llms.txt"
              scanId={scan.id}
              downloadFile={downloadFile}
            />
          )}
        </motion.div>
      )}
    </>
  );
}

interface FileContentSectionProps {
  title: string;
  content: string;
  filename: string;
  scanId: number;
  downloadFile: (content: string, filename: string) => void;
}

function FileContentSection({ title, content, filename, scanId, downloadFile }: FileContentSectionProps) {
  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-sm">{title}</h4>
        <Button
          variant="outline"
          size="sm"
          onClick={() => downloadFile(content, filename)}
          data-testid={`button-download-${filename.replace('.', '-')}-${scanId}`}
        >
          <Download className="w-3 h-3 mr-2" />
          Download
        </Button>
      </div>
      <pre className="p-4 bg-card border border-border rounded-lg text-xs overflow-auto max-h-64 break-words whitespace-pre-wrap font-mono">
        {content}
      </pre>
    </div>
  );
}

function ErrorsAndWarnings({ scan }: { scan: ScanWithPurchase }) {
  const hasErrors = scan.errors && scan.errors.length > 0;
  const hasWarnings = scan.warnings && scan.warnings.length > 0;

  if (!hasErrors && !hasWarnings) return null;

  return (
    <div className="mt-4 space-y-2">
      {scan.errors?.map((error, i) => (
        <div key={i} className="flex items-start gap-2 text-sm text-red-400">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      ))}
      {scan.warnings?.map((warning, i) => (
        <div key={i} className="flex items-start gap-2 text-sm text-yellow-400">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{warning}</span>
        </div>
      ))}
    </div>
  );
}

interface ComparisonActionsProps {
  scan: ScanWithPurchase;
  canQuickCompare: boolean;
  isLatestForUrl: boolean;
  isSelectedForComparison: boolean;
  comparisonMode: boolean;
  selectedComparisonUrl?: string;
  onQuickCompare: (scan: ScanWithPurchase) => void;
  onCompareScans: (scan: ScanWithPurchase) => void;
}

function ComparisonActions({
  scan,
  canQuickCompare,
  isLatestForUrl,
  isSelectedForComparison,
  comparisonMode,
  selectedComparisonUrl,
  onQuickCompare,
  onCompareScans,
}: ComparisonActionsProps) {
  return (
    <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
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
        disabled={comparisonMode && selectedComparisonUrl !== scan.url}
        className={`btn-hover-scale ${isSelectedForComparison ? "bg-primary/20 border border-primary/30" : ""}`}
        data-testid={`button-compare-${scan.id}`}
      >
        <GitCompare className="w-4 h-4 mr-2" />
        {isSelectedForComparison ? "Selected" : "Select to Compare"}
      </Button>
    </div>
  );
}
