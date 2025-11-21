import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Bot, FileCode, Search, CheckCircle, XCircle, Terminal, ArrowRight, Menu, X, Sparkles, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { PaymentModal } from "@/components/PaymentModal";
import { PremiumReport } from "@/components/PremiumReport";
import heroBg from "@assets/generated_images/cybernetic_data_scanning_visualization.png";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 text-primary font-mono text-xl font-bold tracking-tighter">
          <Shield className="w-6 h-6" />
          <span>ROBOSCAN</span>
        </div>

        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Features</a>
          <a href="#demo" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Live Demo</a>
          <Button 
            variant="outline" 
            className="border-primary/50 text-primary hover:bg-primary/10 btn-hover-scale"
            onClick={() => window.location.href = '/api/login'}
            data-testid="button-login"
          >
            Login
          </Button>
          <Button 
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold btn-hover-glow btn-hover-lift"
            onClick={() => window.location.href = '/api/login'}
            data-testid="button-get-started"
          >
            Get Started
          </Button>
        </div>

        <button className="md:hidden text-foreground" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X /> : <Menu />}
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-background border-b border-white/10 overflow-hidden"
          >
            <div className="flex flex-col p-6 gap-4">
              <a href="#features" className="text-sm font-medium" onClick={() => setIsOpen(false)}>Features</a>
              <a href="#demo" className="text-sm font-medium" onClick={() => setIsOpen(false)}>Live Demo</a>
              <Button 
                className="w-full bg-primary text-primary-foreground"
                onClick={() => window.location.href = '/api/login'}
              >
                Get Started
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const Hero = ({ onScan }: { onScan: (url: string) => void }) => {
  const [url, setUrl] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url) onScan(url);
  };

  return (
    <section className="relative min-h-screen pt-20 flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 z-0">
        <img 
          src={heroBg} 
          alt="Background" 
          className="w-full h-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/90 to-background" />
        <div className="absolute inset-0 grid-bg opacity-30" />
      </div>

      <div className="container relative z-10 px-6 py-20 flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-mono mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            New: LLMs.txt Support Live
          </div>
          
          <h1 className="text-4xl md:text-7xl font-bold tracking-tight mb-6 max-w-4xl mx-auto">
            Control How AI <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-500 text-glow">Sees Your Site</span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Generate, validate, and optimize <code className="text-primary bg-primary/10 px-1 py-0.5 rounded">robots.txt</code> and <code className="text-primary bg-primary/10 px-1 py-0.5 rounded">llms.txt</code> to ensure AI agents interact with your content exactly how you intend.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4 w-full max-w-md mx-auto">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input 
                placeholder="example.com" 
                className="pl-10 h-12 bg-background/50 backdrop-blur border-white/10 focus:border-primary/50 transition-colors"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                data-testid="input-url"
              />
            </div>
            <Button 
              type="submit" 
              size="lg" 
              className="h-12 px-8 bg-primary text-primary-foreground hover:bg-primary/90 font-bold btn-hover-glow btn-hover-lift"
              data-testid="button-scan"
            >
              Scan Now
            </Button>
          </form>
          
          <p className="mt-4 text-xs text-muted-foreground">
            Free scan. No credit card required.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

interface ScanResult {
  id: number;
  robotsTxtFound: boolean;
  robotsTxtContent: string | null;
  llmsTxtFound: boolean;
  llmsTxtContent: string | null;
  botPermissions: Record<string, string>;
  errors: string[];
  warnings: string[];
}

const TerminalDemo = ({ 
  isScanning, 
  targetUrl, 
  onScanComplete,
  onUnlockReport
}: { 
  isScanning: boolean; 
  targetUrl: string;
  onScanComplete: (scanId: number) => void;
  onUnlockReport: () => void;
}) => {
  const [lines, setLines] = useState<string[]>([]);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!isScanning || !targetUrl) return;
    
    setLines([]);
    setScanResult(null);
    setIsComplete(false);

    const performScan = async () => {
      const steps = [
        `> Connecting to ${targetUrl}...`,
        "> Resolving DNS...",
      ];

      setLines([...steps]);

      try {
        const response = await fetch('/api/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: targetUrl }),
        });

        if (!response.ok) {
          const error = await response.json();
          setLines(prev => [
            ...prev,
            `> [ERROR] Connection failed: ${error.message || 'Unknown error'}`,
            "> Scan aborted."
          ]);
          return;
        }

        const result: ScanResult = await response.json();
        setScanResult(result);

        const newLines = [...steps];
        newLines.push("> [SUCCESS] Connection established (200 OK)");
        newLines.push("> Searching for robots.txt...");

        if (result.robotsTxtFound) {
          newLines.push("> [SUCCESS] robots.txt found");
          if (result.warnings && result.warnings.length > 0) {
            result.warnings.forEach(w => newLines.push(`> [WARN] ${w}`));
          }
        } else {
          newLines.push("> [WARN] robots.txt not found (404)");
        }

        newLines.push("> Searching for llms.txt...");
        if (result.llmsTxtFound) {
          newLines.push("> [SUCCESS] llms.txt found");
        } else {
          newLines.push("> [ERROR] llms.txt not found (404)");
        }

        newLines.push("> Analyzing AI agent permissions...");
        
        Object.entries(result.botPermissions).forEach(([bot, permission]) => {
          newLines.push(`> [INFO] ${bot}: ${permission}`);
        });

        if (result.errors && result.errors.length > 0) {
          result.errors.forEach(err => newLines.push(`> [ERROR] ${err}`));
        }

        newLines.push("> Basic scan complete.");
        newLines.push("> DONE.");

        let currentLine = 0;
        const interval = setInterval(() => {
          if (currentLine >= newLines.length) {
            clearInterval(interval);
            setIsComplete(true);
            onScanComplete(result.id);
            return;
          }
          
          setLines(prev => {
            const nextLine = newLines[currentLine];
            return nextLine ? [...prev, nextLine] : prev;
          });
          currentLine++;
        }, 200);

        return () => clearInterval(interval);
      } catch (error) {
        setLines(prev => [
          ...prev,
          `> [ERROR] Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          "> Scan aborted."
        ]);
      }
    };

    performScan();
  }, [isScanning, targetUrl, onScanComplete]);

  return (
    <section id="demo" className="py-20 bg-black/20 border-y border-white/5">
      <div className="container mx-auto px-6">
        <div className="flex flex-col lg:flex-row gap-12 items-center">
          <div className="flex-1 space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold">See What Robots See</h2>
            <p className="text-muted-foreground text-lg">
              Most AI agents respect standardized files. If you don't have them, you're leaving your content strategy to chance. Our scanner reveals exactly which bots can access your data.
            </p>
            
            <div className="grid gap-4">
              {[
                { title: "Robots.txt Validation", desc: "Check for syntax errors and logic gaps." },
                { title: "LLMs.txt Generation", desc: "Create the new standard for AI readability." },
                { title: "Bot Permission Audit", desc: "See which specific AI crawlers are allowed." }
              ].map((item, i) => (
                <div key={i} className="flex gap-4">
                  <div className="mt-1 bg-primary/10 p-2 rounded-full h-fit">
                    <CheckCircle className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 w-full space-y-4">
            <Card className="bg-[#0d1117] border-white/10 p-0 overflow-hidden shadow-2xl shadow-primary/5">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-white/5">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/50" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                  <div className="w-3 h-3 rounded-full bg-green-500/50" />
                </div>
                <div className="ml-2 text-xs text-muted-foreground font-mono flex items-center gap-2">
                  <Terminal className="w-3 h-3" />
                  roboscan-cli — v1.0.4
                </div>
              </div>
              <div className="p-6 font-mono text-sm min-h-[300px] flex flex-col" data-testid="terminal-output">
                {!isScanning && lines.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-muted-foreground/50">
                    Waiting for input...
                  </div>
                ) : (
                  lines.map((line, i) => {
                    if (!line) return null;
                    return (
                      <motion.div 
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`mb-1 ${
                          line.includes("[ERROR]") ? "text-red-400" : 
                          line.includes("[WARN]") ? "text-yellow-400" : 
                          line.includes("[SUCCESS]") ? "text-green-400" : 
                          line.includes(">") ? "text-primary" : "text-muted-foreground"
                        }`}
                      >
                        {line}
                      </motion.div>
                    );
                  })
                )}
                {isScanning && lines.length > 0 && !lines[lines.length - 1]?.includes("DONE") && !lines[lines.length - 1]?.includes("aborted") && (
                  <motion.span 
                    animate={{ opacity: [0, 1, 0] }} 
                    transition={{ repeat: Infinity, duration: 0.8 }}
                    className="inline-block w-2 h-4 bg-primary ml-1"
                  />
                )}
              </div>
            </Card>

            <AnimatePresence>
              {isComplete && scanResult && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="p-6 bg-gradient-to-r from-primary/10 to-blue-500/10 border border-primary/20 rounded-xl"
                  data-testid="upgrade-cta"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-primary/20 rounded-xl">
                      <Sparkles className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg mb-2">Want the Full Report?</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Get actionable recommendations, optimized files ready to deploy, and SEO impact analysis for just <span className="text-primary font-bold">$9.99</span>
                      </p>
                      <div className="flex flex-wrap gap-2 text-xs mb-4">
                        <span className="px-2 py-1 bg-primary/10 border border-primary/20 rounded">✓ Priority action plan</span>
                        <span className="px-2 py-1 bg-primary/10 border border-primary/20 rounded">✓ Ready-to-use files</span>
                        <span className="px-2 py-1 bg-primary/10 border border-primary/20 rounded">✓ Instant delivery</span>
                      </div>
                      <Button 
                        className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 font-bold"
                        onClick={onUnlockReport}
                        data-testid="button-get-report"
                      >
                        <Lock className="w-4 h-4 mr-2" />
                        Unlock Optimization Report
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
};

const Features = () => {
  const features = [
    {
      icon: <Bot className="w-8 h-8 text-primary" />,
      title: "Agent Identification",
      desc: "Instantly identify which AI agents are crawling your site and what they are looking for."
    },
    {
      icon: <FileCode className="w-8 h-8 text-primary" />,
      title: "Smart File Generation",
      desc: "Automatically generate optimized robots.txt and llms.txt files tailored to your content strategy."
    },
    {
      icon: <Shield className="w-8 h-8 text-primary" />,
      title: "Content Protection",
      desc: "Block unauthorized scrapers while allowing beneficial AI agents to index your content properly."
    }
  ];

  return (
    <section id="features" className="py-24 container mx-auto px-6">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">Why You Need Roboscan</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          The web has changed. It's not just humans visiting your site anymore.
        </p>
      </div>
      
      <div className="grid md:grid-cols-3 gap-8">
        {features.map((f, i) => (
          <motion.div
            key={i}
            whileHover={{ y: -5 }}
            className="p-6 rounded-2xl bg-card border border-white/5 hover:border-primary/30 transition-colors group"
          >
            <div className="mb-6 p-3 bg-primary/10 w-fit rounded-xl group-hover:bg-primary/20 transition-colors">
              {f.icon}
            </div>
            <h3 className="text-xl font-bold mb-3">{f.title}</h3>
            <p className="text-muted-foreground leading-relaxed">{f.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

const Footer = () => (
  <footer className="py-12 border-t border-white/10 bg-black/20">
    <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
      <div className="flex items-center gap-2 text-primary font-mono font-bold">
        <Shield className="w-5 h-5" />
        <span>ROBOSCAN</span>
      </div>
      <div className="flex gap-8 text-sm text-muted-foreground">
        <a href="#" className="hover:text-primary">Privacy</a>
        <a href="#" className="hover:text-primary">Terms</a>
        <a href="#" className="hover:text-primary">Twitter</a>
        <a href="#" className="hover:text-primary">GitHub</a>
      </div>
      <div className="text-xs text-muted-foreground/50">
        © 2024 Roboscan Inc. All rights reserved.
      </div>
    </div>
  </footer>
);

export default function Home() {
  const [isScanning, setIsScanning] = useState(false);
  const [targetUrl, setTargetUrl] = useState("");
  const [currentScanId, setCurrentScanId] = useState<number | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPremiumReport, setShowPremiumReport] = useState(false);
  const [premiumReportData, setPremiumReportData] = useState<any>(null);

  const handleScan = (url: string) => {
    setTargetUrl(url);
    setIsScanning(true);
    setCurrentScanId(null);
    setShowPremiumReport(false);
    const demoSection = document.getElementById("demo");
    if (demoSection) {
      demoSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleScanComplete = useCallback((scanId: number) => {
    setCurrentScanId(scanId);
  }, []);

  const handleUnlockReport = useCallback(() => {
    if (currentScanId) {
      setShowPaymentModal(true);
    }
  }, [currentScanId]);

  const handlePaymentSuccess = useCallback(async () => {
    setShowPaymentModal(false);
    
    if (currentScanId) {
      try {
        const response = await fetch(`/api/optimization-report/${currentScanId}`);
        if (response.ok) {
          const data = await response.json();
          setPremiumReportData(data);
          setShowPremiumReport(true);
          
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } catch (error) {
        console.error('Failed to fetch report:', error);
      }
    }
  }, [currentScanId]);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30">
      <Navbar />
      {showPremiumReport && premiumReportData ? (
        <div className="container mx-auto px-6 pt-24">
          <PremiumReport report={premiumReportData.report} url={targetUrl} />
        </div>
      ) : (
        <>
          <Hero onScan={handleScan} />
          <Features />
          <TerminalDemo 
            isScanning={isScanning} 
            targetUrl={targetUrl} 
            onScanComplete={handleScanComplete}
            onUnlockReport={handleUnlockReport}
          />
        </>
      )}
      <Footer />

      {currentScanId && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          scanId={currentScanId}
          url={targetUrl}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}
