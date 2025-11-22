import { useState } from "react";
import { motion } from "framer-motion";
import { 
  ArrowRight, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  TrendingUp, 
  FileText, 
  Bot, 
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Calendar,
  GitCompare
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { Scan } from "@shared/schema";
import { 
  compareScanResults, 
  generateOptimizationRecommendations,
  getDiffStats,
  type ScanDifference,
  type OptimizationRecommendation 
} from "@/lib/scanComparison";

interface ScanComparisonProps {
  oldScan: Scan;
  newScan: Scan;
  onClose: () => void;
}

export function ScanComparison({ oldScan, newScan, onClose }: ScanComparisonProps) {
  const differences = compareScanResults(oldScan, newScan);
  const recommendations = generateOptimizationRecommendations(newScan);
  const stats = getDiffStats(differences);
  
  const [showDifferences, setShowDifferences] = useState(true);
  const [showRecommendations, setShowRecommendations] = useState(true);
  const [expandedDiff, setExpandedDiff] = useState<number | null>(null);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
      case 'critical':
        return 'text-red-400 bg-red-400/10 border-red-400/30';
      case 'medium':
      case 'important':
        return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30';
      case 'low':
      case 'suggestion':
        return 'text-blue-400 bg-blue-400/10 border-blue-400/30';
      default:
        return 'text-muted-foreground bg-muted/10 border-muted/30';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high':
      case 'critical':
        return <XCircle className="w-4 h-4" />;
      case 'medium':
      case 'important':
        return <AlertTriangle className="w-4 h-4" />;
      case 'low':
      case 'suggestion':
        return <CheckCircle2 className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const formatDate = (date: string | Date) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2 mb-2">
            <GitCompare className="w-6 h-6 text-primary" />
            Scan Comparison & Analysis
          </h2>
          <p className="text-muted-foreground text-sm">
            Comparing scans for <span className="font-mono text-foreground">{newScan.url}</span>
          </p>
        </div>
        <Button variant="ghost" onClick={onClose} data-testid="button-close-comparison">
          Close
        </Button>
      </div>

      {/* Scan Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4 bg-card border-white/5">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Previous Scan</span>
          </div>
          <p className="text-xs text-muted-foreground">{formatDate(oldScan.createdAt)}</p>
          <div className="mt-3 flex gap-2">
            <Badge variant="outline" className="text-xs">
              {oldScan.robotsTxtFound ? '✓ robots.txt' : '✗ robots.txt'}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {oldScan.llmsTxtFound ? '✓ llms.txt' : '✗ llms.txt'}
            </Badge>
          </div>
        </Card>

        <Card className="p-4 bg-card border-white/5">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">Current Scan</span>
          </div>
          <p className="text-xs text-muted-foreground">{formatDate(newScan.createdAt)}</p>
          <div className="mt-3 flex gap-2">
            <Badge variant="outline" className="text-xs">
              {newScan.robotsTxtFound ? '✓ robots.txt' : '✗ robots.txt'}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {newScan.llmsTxtFound ? '✓ llms.txt' : '✗ llms.txt'}
            </Badge>
          </div>
        </Card>
      </div>

      {/* Stats Overview */}
      {stats.total > 0 && (
        <Card className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Changes Detected</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{stats.total}</div>
              <div className="text-xs text-muted-foreground">Total Changes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400">{stats.high}</div>
              <div className="text-xs text-muted-foreground">High Priority</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">{stats.medium}</div>
              <div className="text-xs text-muted-foreground">Medium Priority</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">{stats.low}</div>
              <div className="text-xs text-muted-foreground">Low Priority</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{stats.byType.bot_permission}</div>
              <div className="text-xs text-muted-foreground">Bot Changes</div>
            </div>
          </div>
        </Card>
      )}

      {/* Differences Section */}
      <Card className="p-6 bg-card border-white/5">
        <button
          onClick={() => setShowDifferences(!showDifferences)}
          className="w-full flex items-center justify-between mb-4"
          data-testid="button-toggle-differences"
        >
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-bold">Detected Differences</h3>
            <Badge variant="outline">{differences.length}</Badge>
          </div>
          {showDifferences ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>

        {showDifferences && (
          <div className="space-y-3">
            {differences.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
                <p className="text-muted-foreground">No differences detected between these scans</p>
              </div>
            ) : (
              differences.map((diff, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`p-4 rounded-lg border ${getSeverityColor(diff.severity)}`}
                  data-testid={`diff-item-${index}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getSeverityIcon(diff.severity)}
                        <span className="font-semibold text-sm">{diff.description}</span>
                        <Badge variant="outline" className="text-xs">
                          {diff.type.replace('_', ' ')}
                        </Badge>
                      </div>
                      
                      {(diff.type === 'robots_txt' || diff.type === 'llms_txt') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedDiff(expandedDiff === index ? null : index)}
                          className="mt-2"
                          data-testid={`button-expand-diff-${index}`}
                        >
                          {expandedDiff === index ? 'Hide Details' : 'Show Details'}
                        </Button>
                      )}

                      {expandedDiff === index && (
                        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 min-w-0">
                          <div className="min-w-0">
                            <div className="text-xs font-semibold mb-2 text-muted-foreground">Previous Version</div>
                            <pre className="p-3 bg-black/40 border border-white/10 rounded text-xs overflow-x-auto overflow-y-auto max-h-64 whitespace-pre">
                              {diff.oldValue || 'Not found'}
                            </pre>
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold mb-2 text-primary">Current Version</div>
                            <pre className="p-3 bg-black/40 border border-primary/30 rounded text-xs overflow-x-auto overflow-y-auto max-h-64 whitespace-pre">
                              {diff.newValue || 'Not found'}
                            </pre>
                          </div>
                        </div>
                      )}

                      {diff.type === 'bot_permission' && (
                        <div className="mt-2 flex items-center gap-3 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Previous:</span>
                            <span className="font-mono">{diff.oldValue}</span>
                          </div>
                          <ArrowRight className="w-3 h-3" />
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Current:</span>
                            <span className="font-mono text-primary">{diff.newValue}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}
      </Card>

      {/* Optimization Recommendations */}
      <Card className="p-6 bg-card border-white/5">
        <button
          onClick={() => setShowRecommendations(!showRecommendations)}
          className="w-full flex items-center justify-between mb-4"
          data-testid="button-toggle-recommendations"
        >
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-bold">Optimization Recommendations</h3>
            <Badge variant="outline">{recommendations.length}</Badge>
          </div>
          {showRecommendations ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>

        {showRecommendations && (
          <div className="space-y-3">
            {recommendations.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
                <p className="text-muted-foreground">
                  Great job! Your configuration follows best practices.
                </p>
              </div>
            ) : (
              recommendations.map((rec, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`p-4 rounded-lg border ${getSeverityColor(rec.severity)}`}
                  data-testid={`recommendation-${index}`}
                >
                  <div className="flex items-start gap-3">
                    {getSeverityIcon(rec.severity)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold">{rec.title}</h4>
                        <Badge variant="outline" className="text-xs">
                          {rec.category.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm mb-2">{rec.description}</p>
                      
                      <div className="mt-3 space-y-2">
                        <div className="p-3 bg-background/50 rounded border border-white/5">
                          <div className="text-xs font-semibold text-primary mb-1">
                            💡 Recommendation
                          </div>
                          <p className="text-sm">{rec.recommendation}</p>
                        </div>
                        
                        <div className="p-3 bg-background/50 rounded border border-white/5">
                          <div className="text-xs font-semibold text-yellow-400 mb-1">
                            ⚡ Impact
                          </div>
                          <p className="text-sm">{rec.impact}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}
      </Card>

      <Separator />

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onClose} className="btn-hover-lift" data-testid="button-done">
          Done
        </Button>
      </div>
    </div>
  );
}
