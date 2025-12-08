import { motion } from "framer-motion";
import { Download, CheckCircle2, AlertTriangle, TrendingUp, FileCode, Sparkles, Award, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface Recommendation {
  priority: 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  action: string;
}

interface GeneratedFiles {
  robotsTxt: string;
  llmsTxt: string;
}

interface SEOImpact {
  crawlability: string;
  indexability: string;
  aiVisibility: string;
}

interface OptimizationReport {
  summary: string;
  score: number;
  recommendations: Recommendation[];
  generatedFiles: GeneratedFiles;
  competitorInsights: string[];
  seoImpact: SEOImpact;
  percentileRank?: number;
}

interface PremiumReportProps {
  report: OptimizationReport;
  url: string;
}

export function PremiumReport({ report, url }: PremiumReportProps) {
  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-400';
    if (score >= 70) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getPriorityColor = (priority: string) => {
    if (priority === 'high') return 'border-red-500/50 bg-red-500/10 text-red-400';
    if (priority === 'medium') return 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400';
    return 'border-blue-500/50 bg-blue-500/10 text-blue-400';
  };

  return (
    <div className="space-y-8 py-12">
      <div className="text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", duration: 0.6 }}
          className="inline-flex items-center justify-center w-20 h-20 bg-primary/20 rounded-full mb-6"
        >
          <Sparkles className="w-10 h-10 text-primary" />
        </motion.div>
        <h2 className="text-3xl md:text-4xl font-bold mb-3">Your Premium Optimization Report</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Comprehensive analysis and actionable recommendations for <span className="text-primary font-mono">{url}</span>
        </p>
        
        {report.percentileRank !== undefined && report.percentileRank >= 90 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1 mt-4 rounded-full bg-yellow-500/20 border border-yellow-500/50 text-yellow-200 font-bold text-sm"
            data-testid="badge-percentile"
          >
            <Trophy className="w-4 h-4" />
            Top 10% of Scanned Sites
          </motion.div>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="p-6 bg-gradient-to-br from-primary/10 to-blue-500/10 border-primary/20">
          <div className="flex items-center justify-between mb-4">
            <span className="text-muted-foreground text-sm">Overall Score</span>
            <Award className="w-5 h-5 text-primary" />
          </div>
          <div className={`text-5xl font-bold ${getScoreColor(report.score)}`}>
            {report.score}
            <span className="text-2xl text-muted-foreground">/100</span>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">{report.summary}</p>
        </Card>

        <Card className="p-6 bg-card border border-border">
          <div className="text-sm text-muted-foreground mb-2">SEO Crawlability</div>
          <div className="text-sm font-medium mb-4">{report.seoImpact.crawlability}</div>
          <div className="text-sm text-muted-foreground mb-2">Indexability</div>
          <div className="text-sm font-medium mb-4">{report.seoImpact.indexability}</div>
          <div className="text-sm text-muted-foreground mb-2">AI Visibility</div>
          <div className="text-sm font-medium">{report.seoImpact.aiVisibility}</div>
        </Card>

        <Card className="p-6 bg-card border border-border">
          <div className="text-sm text-muted-foreground mb-4">Ready-to-Use Files</div>
          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2 text-xs"
              onClick={() => downloadFile(report.generatedFiles.robotsTxt, 'robots.txt')}
              data-testid="button-download-robots"
            >
              <Download className="w-3 h-3" />
              Download robots.txt
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2 text-xs"
              onClick={() => downloadFile(report.generatedFiles.llmsTxt, 'llms.txt')}
              data-testid="button-download-llms"
            >
              <Download className="w-3 h-3" />
              Download llms.txt
            </Button>
          </div>
        </Card>
      </div>

      {report.recommendations.length > 0 && (
        <Card className="p-6 bg-card border border-border">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h3 className="text-xl font-bold">Priority Actions</h3>
          </div>
          
          <div className="space-y-4">
            {report.recommendations.map((rec, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`p-4 rounded-lg border ${getPriorityColor(rec.priority)}`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    {rec.priority === 'high' ? (
                      <AlertTriangle className="w-5 h-5" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-mono uppercase tracking-wide opacity-70">
                        {rec.priority} Priority
                      </span>
                      <span className="text-xs opacity-50">•</span>
                      <span className="text-xs opacity-70">{rec.category}</span>
                    </div>
                    <h4 className="font-bold mb-2">{rec.title}</h4>
                    <p className="text-sm opacity-90 mb-3">{rec.description}</p>
                    <div className="flex items-start gap-2 p-3 bg-black/20 rounded-lg">
                      <FileCode className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <div className="text-xs">
                        <div className="font-semibold mb-1">Action Required:</div>
                        <div className="opacity-90">{rec.action}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </Card>
      )}

      {report.competitorInsights.length > 0 && (
        <Card className="p-6 bg-card border border-border">
          <div className="flex items-center gap-2 mb-6">
            <Award className="w-5 h-5 text-primary" />
            <h3 className="text-xl font-bold">Industry Insights</h3>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            {report.competitorInsights.map((insight, i) => (
              <div key={i} className="flex gap-3 p-3 bg-primary/5 border border-primary/10 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-sm">{insight}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="text-center pt-8">
        <p className="text-sm text-muted-foreground">
          Need help implementing these changes? Our team is here to assist.
        </p>
        <Button variant="outline" className="mt-4">
          Contact Support
        </Button>
      </div>
    </div>
  );
}
