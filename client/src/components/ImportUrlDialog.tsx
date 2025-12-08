// client/src/components/ImportUrlDialog.tsx
// Reusable modal for importing robots.txt or llms.txt from external URLs

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Globe, 
  Download, 
  AlertTriangle, 
  CheckCircle, 
  Loader2, 
  X,
  FileText,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  parseRobotsTxt,
  parseLlmsTxt,
  summarizeRobotsTxtImport,
  summarizeLlmsTxtImport,
  type ParsedRobotsTxt,
  type ParsedLLMsTxt,
} from "@/lib/parsers";

type ImportType = 'robots' | 'llms';

interface ImportUrlDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: ParsedRobotsTxt | ParsedLLMsTxt) => void;
  type: ImportType;
}

type ScanState = 'idle' | 'scanning' | 'success' | 'error' | 'not-found';

interface ScanResult {
  robotsTxtFound: boolean;
  robotsTxtContent: string | null;
  llmsTxtFound: boolean;
  llmsTxtContent: string | null;
}

export function ImportUrlDialog({ isOpen, onClose, onImport, type }: ImportUrlDialogProps) {
  const { toast } = useToast();
  const [targetUrl, setTargetUrl] = useState("");
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [errorMessage, setErrorMessage] = useState("");
  const [parsedData, setParsedData] = useState<ParsedRobotsTxt | ParsedLLMsTxt | null>(null);
  const [rawContent, setRawContent] = useState<string>("");

  const fileType = type === 'robots' ? 'robots.txt' : 'llms.txt';

  const resetState = () => {
    setScanState('idle');
    setErrorMessage("");
    setParsedData(null);
    setRawContent("");
  };

  const handleClose = () => {
    setTargetUrl("");
    resetState();
    onClose();
  };

  const handleScan = async () => {
    if (!targetUrl.trim()) {
      toast({
        title: "URL Required",
        description: "Please enter a website URL to scan.",
        variant: "destructive",
      });
      return;
    }

    resetState();
    setScanState('scanning');

    try {
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl.trim() }),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to scan website');
      }

      const result: ScanResult = await response.json();

      // Check if the requested file type was found
      if (type === 'robots') {
        if (!result.robotsTxtFound || !result.robotsTxtContent) {
          setScanState('not-found');
          setErrorMessage(`No robots.txt file found at ${targetUrl}`);
          return;
        }
        
        const parsed = parseRobotsTxt(result.robotsTxtContent);
        setParsedData(parsed);
        setRawContent(result.robotsTxtContent);
        setScanState('success');
      } else {
        if (!result.llmsTxtFound || !result.llmsTxtContent) {
          setScanState('not-found');
          setErrorMessage(`No llms.txt file found at ${targetUrl}`);
          return;
        }
        
        const parsed = parseLlmsTxt(result.llmsTxtContent);
        setParsedData(parsed);
        setRawContent(result.llmsTxtContent);
        setScanState('success');
      }
    } catch (error) {
      setScanState('error');
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  };

  const handleConfirmImport = () => {
    if (!parsedData) return;

    onImport(parsedData);
    
    toast({
      title: "Configuration Imported",
      description: `Successfully imported ${fileType} configuration from ${new URL(targetUrl).hostname}`,
      className: "border-green-500/50 bg-green-500/10",
    });

    handleClose();
  };

  const getSummary = (): string => {
    if (!parsedData) return '';
    
    if (type === 'robots') {
      return summarizeRobotsTxtImport(parsedData as ParsedRobotsTxt);
    } else {
      return summarizeLlmsTxtImport(parsedData as ParsedLLMsTxt);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[550px] max-h-[85vh] !grid-rows-[auto_1fr] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-primary" />
            Import {fileType} from URL
          </DialogTitle>
          <DialogDescription>
            Scan an existing website to import its {fileType} configuration into your builder.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 overflow-y-auto">
          {/* URL Input */}
          <div className="space-y-2">
            <Label htmlFor="import-url" className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Target Website URL
            </Label>
            <div className="flex gap-2">
              <Input
                id="import-url"
                type="url"
                placeholder="https://example.com"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                disabled={scanState === 'scanning'}
                onKeyDown={(e) => e.key === 'Enter' && handleScan()}
              />
              <Button 
                onClick={handleScan} 
                disabled={scanState === 'scanning'}
                className="shrink-0"
              >
                {scanState === 'scanning' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Scan
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Scanning State */}
          <AnimatePresence mode="wait">
            {scanState === 'scanning' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 bg-muted/50 rounded-lg flex items-center gap-3"
              >
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <div>
                  <p className="font-medium">Scanning website...</p>
                  <p className="text-sm text-muted-foreground">
                    Looking for {fileType} configuration
                  </p>
                </div>
              </motion.div>
            )}

            {scanState === 'error' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg"
              >
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-500">Scan Failed</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {errorMessage}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {scanState === 'not-found' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg"
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-500">File Not Found</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {errorMessage}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {scanState === 'success' && parsedData && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {/* Success Header */}
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg shrink-0">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-green-500">
                        {fileType} Found!
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {getSummary()}
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0">
                      <FileText className="w-3 h-3 mr-1" />
                      {rawContent.split('\n').length} lines
                    </Badge>
                  </div>
                </div>

                {/* Raw Content Preview */}
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">
                    File Preview
                  </Label>
                  <div className="relative">
                    <pre className="p-3 bg-muted/50 rounded-lg text-xs font-mono max-h-[200px] overflow-auto border whitespace-pre-wrap break-words">
                      {rawContent}
                    </pre>
                  </div>
                </div>

                <Separator className="shrink-0" />

                {/* Warning */}
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-start gap-2 shrink-0">
                  <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    <strong className="text-yellow-500">Warning:</strong> Importing will overwrite your current configuration. This action cannot be undone.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 shrink-0">
                  <Button
                    variant="outline"
                    onClick={handleClose}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleConfirmImport}
                    className="flex-1 btn-cta"
                  >
                    <Download className="w-4 h-4" />
                    Confirm Import
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Initial State Hint */}
          {scanState === 'idle' && (
            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Enter a website URL above and click "Scan" to fetch and parse their {fileType} file.
                The parsed configuration will be imported into your builder form.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
