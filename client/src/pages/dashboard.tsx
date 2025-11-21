import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Shield, LogOut, FileText, Lock, Download, CheckCircle2, AlertCircle, Calendar, Globe, Sparkles, Search, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { PaymentModal } from "@/components/PaymentModal";
import type { Scan } from "@shared/schema";

interface ScanWithPurchase extends Scan {
  isPurchased: boolean;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [scans, setScans] = useState<ScanWithPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedScan, setSelectedScan] = useState<ScanWithPurchase | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [expandedScan, setExpandedScan] = useState<number | null>(null);
  const [scanUrl, setScanUrl] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  useEffect(() => {
    fetchScans();
  }, []);

  const fetchScans = async () => {
    try {
      const response = await fetch('/api/user/scans');
      if (response.ok) {
        const data = await response.json();
        setScans(data);
      }
    } catch (error) {
      console.error('Failed to fetch scans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlock = (scan: ScanWithPurchase) => {
    setSelectedScan(scan);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    fetchScans(); // Refresh scans to update purchase status
  };

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

  const handleScan = async () => {
    if (!scanUrl.trim()) return;

    setIsScanning(true);
    setScanError(null);

    try {
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: scanUrl }),
      });

      if (!response.ok) {
        throw new Error('Failed to scan website');
      }

      await response.json();
      
      // Refresh scans list
      await fetchScans();
      setScanUrl("");
    } catch (error) {
      console.error('Scan error:', error);
      setScanError(error instanceof Error ? error.message : 'Failed to scan website');
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary font-mono text-xl font-bold tracking-tighter">
            <Shield className="w-6 h-6" />
            <span>ROBOSCAN</span>
          </div>

          <div className="flex items-center gap-4">
            {user && (
              <div className="flex items-center gap-3">
                {user.profileImageUrl && (
                  <img 
                    src={user.profileImageUrl} 
                    alt="Profile" 
                    className="w-8 h-8 rounded-full object-cover border border-primary/30"
                  />
                )}
                <span className="text-sm text-muted-foreground">
                  {user.firstName || user.email}
                </span>
              </div>
            )}
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.location.href = '/api/logout'}
              className="border-white/10"
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto px-6 pt-24 pb-12">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            Welcome back{user?.firstName ? `, ${user.firstName}` : ''}!
          </h1>
          <p className="text-muted-foreground">
            View and manage your website scans and optimization reports
          </p>
        </div>

        {/* Scan Input Section */}
        <Card className="p-6 bg-card border-white/5 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Search className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold">Scan a New Website</h2>
          </div>
          <div className="flex gap-3">
            <Input
              type="url"
              placeholder="Enter website URL (e.g., example.com)"
              value={scanUrl}
              onChange={(e) => setScanUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !isScanning && handleScan()}
              disabled={isScanning}
              className="flex-1 bg-background border-white/10 focus:border-primary"
              data-testid="input-scan-url"
            />
            <Button
              onClick={handleScan}
              disabled={isScanning || !scanUrl.trim()}
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-8"
              data-testid="button-scan"
            >
              {isScanning ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                  Scanning...
                </>
              ) : (
                <>
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Scan
                </>
              )}
            </Button>
          </div>
          {scanError && (
            <div className="mt-3 text-sm text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {scanError}
            </div>
          )}
        </Card>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : scans.length === 0 ? (
          <Card className="p-12 text-center bg-card border-white/5">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/20 rounded-full mb-4">
              <FileText className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2">No scans yet</h3>
            <p className="text-muted-foreground">
              Use the scan input above to analyze your first website
            </p>
          </Card>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">Your Scans</h2>
              <span className="text-sm text-muted-foreground">{scans.length} {scans.length === 1 ? 'scan' : 'scans'}</span>
            </div>
          <div className="space-y-4">
            {scans.map((scan) => (
              <Card 
                key={scan.id} 
                className="p-6 bg-card border-white/5 hover:border-primary/20 transition-all"
                data-testid={`scan-card-${scan.id}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
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

                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
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
                            className="mt-4 space-y-4"
                          >
                            {scan.robotsTxtContent && (
                              <div>
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
                                <pre className="p-4 bg-black/40 border border-white/10 rounded-lg text-xs overflow-x-auto max-h-64">
                                  {scan.robotsTxtContent}
                                </pre>
                              </div>
                            )}

                            {scan.llmsTxtContent && (
                              <div>
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
                                <pre className="p-4 bg-black/40 border border-white/10 rounded-lg text-xs overflow-x-auto max-h-64">
                                  {scan.llmsTxtContent}
                                </pre>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </>
                    ) : (
                      <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                        <div className="flex items-start gap-3">
                          <Lock className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm mb-3">
                              Unlock the full optimization report to access{" "}
                              <span className="font-semibold">robots.txt</span> and{" "}
                              <span className="font-semibold">llms.txt</span> files with detailed recommendations.
                            </p>
                            <Button
                              onClick={() => handleUnlock(scan)}
                              size="sm"
                              className="bg-primary text-primary-foreground hover:bg-primary/90"
                              data-testid={`button-unlock-${scan.id}`}
                            >
                              <Sparkles className="w-4 h-4 mr-2" />
                              Unlock for $9.99
                            </Button>
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
              </Card>
            ))}
          </div>
          </>
        )}
      </div>

      {selectedScan && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          scanId={selectedScan.id}
          url={selectedScan.url}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}
