import { useState } from "react";
import { 
  ArrowRight, CheckCircle2, XCircle, AlertTriangle, 
  FileText, Bot, LayoutGrid, Scale 
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Scan } from "@shared/schema";
import { getBotPermissionMatrix } from "@/lib/scanComparison";

interface ScanComparisonProps {
  scanA: Scan;
  scanB: Scan;
  labels?: [string, string];
  onClose: () => void;
}

export function ScanComparison({ 
  scanA, 
  scanB, 
  labels = ["Scan A", "Scan B"], 
  onClose 
}: ScanComparisonProps) {
  if (!scanA || !scanB || !scanA.url || !scanB.url) {
    return (
      <div className="flex flex-col h-[80vh] items-center justify-center">
        <XCircle className="w-12 h-12 text-red-400 mb-4" />
        <p className="text-muted-foreground mb-4">Invalid scan data provided for comparison</p>
        <Button variant="outline" onClick={onClose} data-testid="button-close-comparison">Close</Button>
      </div>
    );
  }

  const botMatrix = getBotPermissionMatrix(scanA, scanB);
  const [activeTab, setActiveTab] = useState("overview");

  const getStatusColor = (found: boolean) => found ? "text-green-400" : "text-red-400";
  const getStatusIcon = (found: boolean) => found ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />;

  const getHostname = (url: string) => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  };

  return (
    <div className="flex flex-col h-[80vh]">
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Scale className="w-6 h-6 text-primary" />
            Comparison Analysis
          </h2>
          <p className="text-muted-foreground text-sm">
            Comparing <span className="text-primary">{labels[0]}</span> vs <span className="text-primary">{labels[1]}</span>
          </p>
        </div>
        <Button variant="outline" onClick={onClose} data-testid="button-close-comparison">Close</Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <TabsList className="grid w-full grid-cols-3 mb-4 shrink-0">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="bots" data-testid="tab-bots">Bot Permissions</TabsTrigger>
          <TabsTrigger value="files" data-testid="tab-files">File Content</TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto min-h-0 pr-2">
          <TabsContent value="overview" className="mt-0 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4 bg-card border border-border" data-testid="card-scan-a">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg" data-testid="text-label-a">{labels[0]}</h3>
                  <Badge variant="outline" className="font-mono" data-testid="text-hostname-a">{getHostname(scanA.url)}</Badge>
                </div>
                <div className="space-y-2">
                  <div className={`flex items-center gap-2 ${getStatusColor(scanA.robotsTxtFound)}`}>
                    {getStatusIcon(scanA.robotsTxtFound)}
                    <span className="text-sm font-medium">robots.txt</span>
                  </div>
                  <div className={`flex items-center gap-2 ${getStatusColor(scanA.llmsTxtFound)}`}>
                    {getStatusIcon(scanA.llmsTxtFound)}
                    <span className="text-sm font-medium">llms.txt</span>
                  </div>
                  <div className="flex items-center gap-2 text-yellow-400">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-sm">{scanA.warnings?.length || 0} Warnings</span>
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-card border border-border" data-testid="card-scan-b">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg" data-testid="text-label-b">{labels[1]}</h3>
                  <Badge variant="outline" className="font-mono" data-testid="text-hostname-b">{getHostname(scanB.url)}</Badge>
                </div>
                <div className="space-y-2">
                  <div className={`flex items-center gap-2 ${getStatusColor(scanB.robotsTxtFound)}`}>
                    {getStatusIcon(scanB.robotsTxtFound)}
                    <span className="text-sm font-medium">robots.txt</span>
                  </div>
                  <div className={`flex items-center gap-2 ${getStatusColor(scanB.llmsTxtFound)}`}>
                    {getStatusIcon(scanB.llmsTxtFound)}
                    <span className="text-sm font-medium">llms.txt</span>
                  </div>
                  <div className="flex items-center gap-2 text-yellow-400">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-sm">{scanB.warnings?.length || 0} Warnings</span>
                  </div>
                </div>
              </Card>
            </div>

            <Card className="p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <LayoutGrid className="w-5 h-5 text-primary" />
                Configuration Summary
              </h3>
              <div className="grid grid-cols-2 gap-8 text-sm">
                <div>
                  <span className="text-muted-foreground block mb-1">Key Differences</span>
                  <ul className="list-disc list-inside space-y-1">
                    {scanA.robotsTxtContent !== scanB.robotsTxtContent && <li>robots.txt content differs</li>}
                    {scanA.llmsTxtContent !== scanB.llmsTxtContent && <li>llms.txt content differs</li>}
                    {Object.keys(scanA.botPermissions || {}).length !== Object.keys(scanB.botPermissions || {}).length && (
                      <li>Different number of explicitly handled bots</li>
                    )}
                    {scanA.robotsTxtContent === scanB.robotsTxtContent && 
                     scanA.llmsTxtContent === scanB.llmsTxtContent && 
                     Object.keys(scanA.botPermissions || {}).length === Object.keys(scanB.botPermissions || {}).length && (
                      <li className="text-green-400">No major differences detected</li>
                    )}
                  </ul>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="bots" className="mt-0">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bot Agent</TableHead>
                    <TableHead>{labels[0]}</TableHead>
                    <TableHead>{labels[1]}</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {botMatrix.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No bot permissions found in either scan
                      </TableCell>
                    </TableRow>
                  ) : (
                    botMatrix.map((row) => (
                      <TableRow 
                        key={row.bot} 
                        className={row.status !== 'same' ? 'bg-muted/30' : ''}
                        data-testid={`bot-row-${row.bot}`}
                      >
                        <TableCell className="font-medium font-mono">{row.bot}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            row.valA.includes('Allow') ? 'text-green-400 border-green-400/30' : 
                            row.valA === '-' ? 'text-muted-foreground' : 'text-red-400 border-red-400/30'
                          }>
                            {row.valA}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            row.valB.includes('Allow') ? 'text-green-400 border-green-400/30' : 
                            row.valB === '-' ? 'text-muted-foreground' : 'text-red-400 border-red-400/30'
                          }>
                            {row.valB}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {row.status !== 'same' && (
                            <Badge variant="secondary">Difference</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="files" className="mt-0 space-y-6">
            <div className="grid grid-cols-2 gap-4 h-[500px]">
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-sm font-semibold">{labels[0]} (robots.txt)</span>
                </div>
                <ScrollArea className="flex-1 w-full rounded-md border bg-muted/30 p-4" data-testid="scroll-robots-a">
                  <pre className="text-xs font-mono whitespace-pre-wrap">
                    {scanA.robotsTxtContent || "File not found"}
                  </pre>
                </ScrollArea>
              </div>
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-sm font-semibold">{labels[1]} (robots.txt)</span>
                </div>
                <ScrollArea className="flex-1 w-full rounded-md border bg-muted/30 p-4" data-testid="scroll-robots-b">
                  <pre className="text-xs font-mono whitespace-pre-wrap">
                    {scanB.robotsTxtContent || "File not found"}
                  </pre>
                </ScrollArea>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4 h-[500px]">
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-sm font-semibold">{labels[0]} (llms.txt)</span>
                </div>
                <ScrollArea className="flex-1 w-full rounded-md border bg-muted/30 p-4" data-testid="scroll-llms-a">
                  <pre className="text-xs font-mono whitespace-pre-wrap">
                    {scanA.llmsTxtContent || "File not found"}
                  </pre>
                </ScrollArea>
              </div>
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-sm font-semibold">{labels[1]} (llms.txt)</span>
                </div>
                <ScrollArea className="flex-1 w-full rounded-md border bg-muted/30 p-4" data-testid="scroll-llms-b">
                  <pre className="text-xs font-mono whitespace-pre-wrap">
                    {scanB.llmsTxtContent || "File not found"}
                  </pre>
                </ScrollArea>
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
