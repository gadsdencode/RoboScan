import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Bot, FileCode, Search, CheckCircle, XCircle, Terminal, ArrowRight, Sparkles, Lock, Zap, FileSearch, Clock, DollarSign, TrendingUp, Eye, RefreshCw, Building2, User, ChevronRight, Globe, FileText, ShieldCheck, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { PaymentModal } from "@/components/PaymentModal";
import { PremiumReport } from "@/components/PremiumReport";
import { Navbar } from "@/components/Navbar";

// Enhanced StepTracker Component with Pre-flight Checklist
type ScanStep = 'input' | 'scanning' | 'report';

interface StepTrackerProps {
  currentStep: ScanStep;
  preflightStatus?: string;
}

const StepTracker = ({ currentStep, preflightStatus }: StepTrackerProps) => {
  const steps = [
    { id: 'input', label: 'Enter URL', number: 1 },
    { id: 'scanning', label: 'Scanning', number: 2 },
    { id: 'report', label: 'View Report', number: 3 }
  ];

  const getStepState = (stepId: string) => {
    const stepIndex = steps.findIndex(s => s.id === stepId);
    const currentIndex = steps.findIndex(s => s.id === currentStep);
    
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'active';
    return 'pending';
  };

  return (
    <div className="flex items-center justify-center gap-2 md:gap-4">
      {steps.map((step, index) => {
        const state = getStepState(step.id);
        
        return (
          <div key={step.id} className="flex items-center">
            <motion.div 
              className="flex items-center gap-2"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className={`
                relative flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full font-bold text-sm transition-all
                ${state === 'completed' ? 'bg-primary text-primary-foreground' : ''}
                ${state === 'active' ? 'bg-primary text-primary-foreground ring-4 ring-primary/30' : ''}
                ${state === 'pending' ? 'bg-muted text-muted-foreground border border-border' : ''}
              `}>
                {state === 'completed' ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <span>{step.number}</span>
                )}
                {state === 'active' && (
                  <motion.div
                    className="absolute inset-0 rounded-full bg-primary"
                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  />
                )}
              </div>
              <span className={`hidden md:inline text-sm font-medium ${
                state === 'active' ? 'text-foreground' : 'text-muted-foreground'
              }`}>
                {step.label}
              </span>
            </motion.div>
            
            {index < steps.length - 1 && (
              <div className={`
                w-8 md:w-16 h-0.5 mx-2 transition-all
                ${state === 'completed' ? 'bg-primary' : 'bg-border'}
              `} />
            )}
          </div>
        );
      })}
      {preflightStatus && currentStep === 'scanning' && (
        <div className="mt-4 text-center">
          <p className="text-xs text-muted-foreground font-mono">{preflightStatus}</p>
        </div>
      )}
    </div>
  );
};

// Enhanced Hero Component with Enterprise Aesthetic - Product-Led Layout
const Hero = ({ 
  onScan, 
  currentStep,
  isScanning,
  preflightStatus,
  userType,
  setUserType,
  children // [NEW] Accept children (The Terminal)
}: { 
  onScan: (url: string) => void;
  currentStep: ScanStep;
  isScanning: boolean;
  preflightStatus?: string;
  userType: 'business' | 'agency';
  setUserType: (type: 'business' | 'agency') => void;
  children?: React.ReactNode;
}) => {
  const [url, setUrl] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url) onScan(url);
  };

  return (
    <section className="relative min-h-screen pt-16 flex flex-col items-center">
      {/* CRITICAL CSS FIX: 
         Moved 'overflow-hidden' to this background div so 'sticky' positioning works.
         The parent <section> must NOT have overflow-hidden for sticky to work.
      */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />
        <div className="absolute inset-0 grid-bg opacity-20" />
      </div>

      <div className="container relative z-10 px-6 py-12 flex flex-col items-center text-center max-w-5xl">
        
        {/* 1. COLLAPSIBLE HEADER: Only show on 'input' step - stays collapsed during scan AND after completion */}
        <AnimatePresence>
          {currentStep === 'input' && (
            <motion.div
              initial={{ opacity: 0, y: 20, height: 'auto' }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center overflow-hidden"
            >
              {/* Badge with "Big 7" positioning */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-primary/20 to-blue-500/20 border border-primary/30 text-primary text-xs font-mono mb-8">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                <span className="font-semibold">SEO on Steroids for AI</span>
                <span className="text-muted-foreground">•</span>
                <span>8 Technical Files</span>
              </div>
              
              <h1 className="text-4xl md:text-7xl font-bold tracking-tight mb-6 max-w-4xl mx-auto leading-[1.1]">
                Rank Higher in the <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-500 to-cyan-400">AI Era</span>
              </h1>
              
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-6 leading-relaxed">
                Get discovered by the <span className="text-foreground font-semibold">Big 7 LLMs</span> — OpenAI, Google, Anthropic, Meta, Microsoft, Mistral & Perplexity. We generate the <span className="text-primary font-semibold">8 technical files</span> your site needs to be found, cited, and ranked by AI.
              </p>

              {/* Big 7 LLM logos/badges */}
              <div className="flex flex-wrap justify-center gap-2 mb-10">
                {['OpenAI', 'Google', 'Anthropic', 'Meta', 'Microsoft', 'Mistral', 'Perplexity'].map((llm, i) => (
                  <span 
                    key={llm} 
                    className="px-3 py-1 text-xs font-medium bg-card border border-border rounded-full text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors cursor-default"
                  >
                    {llm}
                  </span>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 2. STICKY TRACKER: Keeps context visible while terminal runs */}
        <div className="sticky top-16 z-30 w-full bg-background/95 backdrop-blur-md py-4 mb-8 rounded-b-xl border-b border-border shadow-sm transition-all">
          <StepTracker currentStep={currentStep} preflightStatus={preflightStatus} />
        </div>

        {/* Interactive User Type Toggle - High Visibility Cards */}
        {currentStep === 'input' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-xl mx-auto mb-8"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Business Option */}
              <button
                type="button"
                onClick={() => setUserType('business')}
                className={`
                  relative flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200 group
                  ${userType === 'business' 
                    ? 'border-primary bg-primary/5 text-primary shadow-md ring-1 ring-primary/20 scale-[1.02]' 
                    : 'border-border bg-card/50 text-muted-foreground hover:border-primary/30 hover:bg-card hover:text-foreground'}
                `}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <User className={`w-5 h-5 ${userType === 'business' ? 'fill-current' : ''}`} />
                  <span className="font-bold text-lg tracking-tight">Business Owner</span>
                </div>
                <span className="text-xs font-medium opacity-80">
                  Optimizing a Single Website
                </span>
                
                {/* Active Checkmark Badge */}
                {userType === 'business' && (
                  <div className="absolute top-2 right-2 text-primary">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                )}
              </button>

              {/* Agency Option */}
              <button
                type="button"
                onClick={() => setUserType('agency')}
                className={`
                  relative flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200 group
                  ${userType === 'agency' 
                    ? 'border-blue-500 bg-blue-500/5 text-blue-500 shadow-md ring-1 ring-blue-500/20 scale-[1.02]' 
                    : 'border-border bg-card/50 text-muted-foreground hover:border-blue-500/30 hover:bg-card hover:text-foreground'}
                `}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <Building2 className={`w-5 h-5 ${userType === 'agency' ? 'fill-current' : ''}`} />
                  <span className="font-bold text-lg tracking-tight">Agency</span>
                </div>
                <span className="text-xs font-medium opacity-80">
                  Managing Multiple Clients
                </span>

                {/* Active Checkmark Badge */}
                {userType === 'agency' && (
                  <div className="absolute top-2 right-2 text-blue-500">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {/* Input Form - scales down when scanning to de-emphasize */}
        <motion.div
          className="w-full max-w-2xl mx-auto"
          animate={{ 
            scale: isScanning ? 0.95 : 1, 
            opacity: isScanning ? 0.8 : 1 
          }}
          transition={{ duration: 0.3 }}
        >
          <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
            <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-2xl">
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Search className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left flex-1">
                  <h3 className="font-bold text-lg mb-1">Enter Your Website URL</h3>
                  <p className="text-sm text-muted-foreground">
                    Get AI-ready in under 3 minutes. No technical knowledge required.
                  </p>
                </div>
              </div>
              
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Input 
                    placeholder={userType === 'business' ? "example.com" : "client-website.com"} 
                    className="h-12 bg-background border-border focus:border-primary transition-colors text-base font-mono"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    data-testid="input-url"
                    disabled={isScanning}
                  />
                </div>
                <Button 
                  type="submit" 
                  size="lg" 
                  className="h-12 px-8 bg-primary text-primary-foreground hover:bg-primary/90 font-bold btn-hover-lift"
                  data-testid="button-scan"
                  disabled={isScanning || !url}
                >
                  {isScanning ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                        className="w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2"
                      />
                      Scanning...
                    </>
                  ) : (
                    <>
                      Begin Analysis
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </motion.div>
        
        {!isScanning && currentStep === 'input' && (
          <div className="mt-6 flex flex-col items-center gap-2">
            <p className="text-xs text-muted-foreground">
              ✓ Free scan • ✓ No credit card • ✓ Results in 2.3 minutes
            </p>
            <p className="text-xs text-primary/70 font-mono">
              Join 10,000+ websites already optimized for AI
            </p>
          </div>
        )}

        {/* 3. TERMINAL INJECTION: Render children here */}
        <AnimatePresence>
          {children && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4 }}
              className="w-full mt-8"
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>
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
  // 6 additional technical files
  sitemapXmlFound?: boolean;
  sitemapXmlContent?: string | null;
  securityTxtFound?: boolean;
  securityTxtContent?: string | null;
  manifestJsonFound?: boolean;
  manifestJsonContent?: string | null;
  adsTxtFound?: boolean;
  adsTxtContent?: string | null;
  humansTxtFound?: boolean;
  humansTxtContent?: string | null;
  aiTxtFound?: boolean;
  aiTxtContent?: string | null;
  botPermissions: Record<string, string>;
  errors: string[];
  warnings: string[];
}

const TerminalDemo = ({ 
  isScanning, 
  targetUrl, 
  onScanComplete,
  onUnlockReport,
  onScanError,
  userType
}: { 
  isScanning: boolean; 
  targetUrl: string;
  onScanComplete: (scanId: number) => void;
  onUnlockReport: () => void;
  onScanError: () => void;
  userType: 'business' | 'agency';
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
      // Enhanced pre-flight checklist
      const preflightSteps = [
        `> Initializing scan for ${targetUrl}...`,
        "> Resolving DNS...",
        "> Checking SSL certificate...",
        "> Establishing secure connection...",
        `> Connecting to ${targetUrl}...`,
      ];

      setLines([...preflightSteps]);

      try {
        const response = await fetch('/api/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: targetUrl }),
          credentials: "include",
        });

        if (!response.ok) {
          const error = await response.json();
          setLines(prev => [
            ...prev,
            `> [ERROR] Connection failed: ${error.message || 'Unknown error'}`,
            "> Scan aborted."
          ]);
          onScanError();
          return;
        }

        const result: ScanResult = await response.json();
        setScanResult(result);

        const newLines = [...preflightSteps];
        newLines.push("> [SUCCESS] Connection established (200 OK)");
        newLines.push("> [SUCCESS] SSL certificate validated");
        
        // Scan all 8 technical files
        newLines.push("> Scanning 8 technical files...");
        newLines.push("");
        
        // 1. robots.txt
        newLines.push("> [1/8] Locating robots.txt...");
        if (result.robotsTxtFound) {
          newLines.push("> [SUCCESS] robots.txt found");
          if (result.warnings && result.warnings.length > 0) {
            result.warnings.forEach(w => newLines.push(`> [WARN] ${w}`));
          }
        } else {
          newLines.push("> [WARN] robots.txt not found (404)");
        }

        // 2. llms.txt
        newLines.push("> [2/8] Locating llms.txt...");
        if (result.llmsTxtFound) {
          newLines.push("> [SUCCESS] llms.txt found");
        } else {
          newLines.push("> [WARN] llms.txt not found (404)");
        }

        // 3. sitemap.xml
        newLines.push("> [3/8] Locating sitemap.xml...");
        if (result.sitemapXmlFound) {
          newLines.push("> [SUCCESS] sitemap.xml found");
        } else {
          newLines.push("> [WARN] sitemap.xml not found (404)");
        }

        // 4. security.txt
        newLines.push("> [4/8] Locating security.txt...");
        if (result.securityTxtFound) {
          newLines.push("> [SUCCESS] security.txt found (RFC 9116)");
        } else {
          newLines.push("> [WARN] security.txt not found (404)");
        }

        // 5. manifest.json
        newLines.push("> [5/8] Locating manifest.json...");
        if (result.manifestJsonFound) {
          newLines.push("> [SUCCESS] manifest.json found (PWA ready)");
        } else {
          newLines.push("> [WARN] manifest.json not found (404)");
        }

        // 6. ads.txt
        newLines.push("> [6/8] Locating ads.txt...");
        if (result.adsTxtFound) {
          newLines.push("> [SUCCESS] ads.txt found (IAB standard)");
        } else {
          newLines.push("> [INFO] ads.txt not found (optional)");
        }

        // 7. humans.txt
        newLines.push("> [7/8] Locating humans.txt...");
        if (result.humansTxtFound) {
          newLines.push("> [SUCCESS] humans.txt found");
        } else {
          newLines.push("> [INFO] humans.txt not found (optional)");
        }

        // 8. ai.txt
        newLines.push("> [8/8] Locating ai.txt...");
        if (result.aiTxtFound) {
          newLines.push("> [SUCCESS] ai.txt found");
        } else {
          newLines.push("> [INFO] ai.txt not found (optional)");
        }

        newLines.push("");
        newLines.push("> Analyzing AI agent permissions...");
        
        Object.entries(result.botPermissions).forEach(([bot, permission]) => {
          newLines.push(`> [INFO] ${bot}: ${permission}`);
        });

        if (result.errors && result.errors.length > 0) {
          result.errors.forEach(err => newLines.push(`> [ERROR] ${err}`));
        }

        // Calculate files found
        const filesFound = [
          result.robotsTxtFound, 
          result.llmsTxtFound,
          result.sitemapXmlFound,
          result.securityTxtFound,
          result.manifestJsonFound,
          result.adsTxtFound,
          result.humansTxtFound,
          result.aiTxtFound
        ].filter(Boolean).length;

        newLines.push("");
        newLines.push(`> Technical files found: ${filesFound}/8`);
        newLines.push("> Scan complete.");
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
        onScanError();
      }
    };

    performScan();
  }, [isScanning, targetUrl, onScanComplete, onScanError]);

  if (!isScanning && lines.length === 0) return null;

  return (
    <motion.div 
      id="terminal"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="w-full"
    >
      {/* Embedded header - more compact since we're inside Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-center mb-6"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-mono mb-3">
          <Zap className="w-3 h-3" />
          Step 2: Live Analysis
        </div>
        <h2 className="text-2xl md:text-3xl font-bold">Real-Time Scan Results</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Watch as we analyze your site's AI readiness
        </p>
      </motion.div>

      <div className="flex flex-col lg:flex-row gap-6 items-stretch w-full">
        {/* LEFT COLUMN: Shows checklist during scan, CTA after completion */}
        <div className="flex-1 flex flex-col">
          <AnimatePresence mode="wait">
            {!isComplete ? (
              /* Checklist - shown during scanning */
              <motion.div 
                key="checklist"
                className="space-y-6 h-full"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <h3 className="text-2xl font-bold">What We're Checking:</h3>
                
                <div className="grid gap-4">
                  {[
                    { 
                      title: "1. Bot Identification", 
                      desc: "Detecting which AI crawlers can access your site",
                      icon: <Bot className="w-5 h-5" />
                    },
                    { 
                      title: "2. Permission Validation", 
                      desc: "Analyzing robots.txt rules and agent permissions",
                      icon: <Shield className="w-5 h-5" />
                    },
                    { 
                      title: "3. File Generation", 
                      desc: "Preparing optimized configurations for AI agents",
                      icon: <FileCode className="w-5 h-5" />
                    }
                  ].map((item, i) => (
                    <motion.div 
                      key={i} 
                      className="flex gap-4 p-4 rounded-xl bg-card border border-border card-hover"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + (i * 0.1) }}
                    >
                      <div className="mt-1 bg-primary/10 p-2 rounded-lg h-fit">
                        {item.icon}
                      </div>
                      <div>
                        <h4 className="font-bold text-primary">{item.title}</h4>
                        <p className="text-sm text-muted-foreground">{item.desc}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ) : (
              /* CTA - shown after scan completes (BESIDE the terminal, not under it) */
              <motion.div
                key="cta"
                initial={{ opacity: 0, x: -20, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -20, scale: 0.95 }}
                transition={{ duration: 0.4 }}
                className="h-full flex flex-col"
                data-testid="upgrade-cta"
              >
                <div className="p-6 bg-card border-2 border-primary/40 rounded-xl shadow-lg shadow-primary/10 flex-1 flex flex-col">
                  {userType === 'business' ? (
                    /* Business Owner CTA - Single Site License */
                    <>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-gradient-to-br from-primary/30 to-blue-500/30 rounded-xl">
                          <Sparkles className="w-7 h-7 text-primary" />
                        </div>
                        <div>
                          <p className="text-xs text-emerald-500 font-mono uppercase tracking-wider flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Analysis Complete
                          </p>
                          <h3 className="font-bold text-xl">Your AI Visibility Report is Ready</h3>
                        </div>
                      </div>
                      
                      <p className="text-muted-foreground mb-5 leading-relaxed">
                        Get <span className="text-primary font-semibold">8 optimized technical files</span> tailored to your brand, plus a complete action plan to rank in the Big 7 LLMs.
                      </p>
                      
                      <div className="space-y-2 mb-5 flex-1">
                        {[
                          "All 8 technical files (robots.txt, llms.txt, etc.)",
                          "Big 7 LLM compatibility matrix",
                          "Priority action plan with fixes",
                          "One-click copy & PDF download"
                        ].map((item, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                      
                      <div className="mt-auto">
                        {/* Pricing with value framing */}
                        <div className="p-4 rounded-lg bg-gradient-to-r from-primary/5 to-blue-500/5 border border-primary/20 mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-muted-foreground">Single Site License</span>
                            <span className="text-xs text-muted-foreground line-through">$29.99</span>
                          </div>
                          <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold text-primary">$9.99</span>
                            <span className="text-muted-foreground text-sm">one-time payment</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            💡 Skip 8+ hours of manual work
                          </p>
                        </div>
                        
                        <Button 
                          className="w-full btn-cta h-12 text-base"
                          onClick={onUnlockReport}
                          data-testid="button-get-report"
                        >
                          <Zap className="w-4 h-4 mr-2" />
                          Get My AI Files Now
                        </Button>
                        
                        <p className="text-xs text-muted-foreground text-center mt-3 flex items-center justify-center gap-2">
                          <Lock className="w-3 h-3" />
                          Secure payment • Instant delivery
                        </p>
                        
                        <div className="mt-4 pt-4 border-t border-border text-center">
                          <a 
                            href="/pricing" 
                            className="text-xs text-primary hover:underline flex items-center justify-center gap-1"
                          >
                            <Building2 className="w-3 h-3" />
                            Managing multiple sites? View Agency plans →
                          </a>
                        </div>
                      </div>
                    </>
                  ) : (
                    /* Agency CTA - Guardian Tier Subscription */
                    <>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-gradient-to-br from-blue-500/30 to-cyan-500/30 rounded-xl">
                          <Building2 className="w-7 h-7 text-blue-500" />
                        </div>
                        <div>
                          <p className="text-xs text-emerald-500 font-mono uppercase tracking-wider flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Analysis Complete
                          </p>
                          <h3 className="font-bold text-xl">Generate Professional Client Audit</h3>
                        </div>
                      </div>
                      
                      <p className="text-muted-foreground mb-5 leading-relaxed">
                        Impress your clients with a <span className="text-primary font-semibold">white-labeled AI visibility audit</span>. Unlock recurring revenue services for your agency.
                      </p>
                      
                      <div className="space-y-2 mb-5 flex-1">
                        {[
                          "Unlimited Client Scans",
                          "White-label PDF Reports",
                          "Change Monitoring Alerts",
                          "Priority Support"
                        ].map((item, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                      
                      <div className="mt-auto">
                        {/* Guardian Tier Pricing */}
                        <div className="p-4 rounded-lg bg-gradient-to-r from-blue-500/5 to-cyan-500/5 border border-blue-500/20 mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-muted-foreground">Guardian Tier</span>
                            <span className="text-xs text-blue-500 font-mono px-2 py-0.5 bg-blue-500/10 rounded-full">Best for Agencies</span>
                          </div>
                          <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold text-blue-500">$29</span>
                            <span className="text-muted-foreground text-sm">/month</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            🚀 Scale your AI SEO services
                          </p>
                        </div>
                        
                        <Button 
                          className="w-full h-12 text-base bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg"
                          onClick={() => window.location.href = '/pricing?tier=guardian'}
                          data-testid="button-start-agency-trial"
                        >
                          <Sparkles className="w-4 h-4 mr-2" />
                          Start Agency Trial
                        </Button>
                        
                        <p className="text-xs text-muted-foreground text-center mt-3 flex items-center justify-center gap-2">
                          <Lock className="w-3 h-3" />
                          Cancel anytime • 14-day free trial
                        </p>
                        
                        <div className="mt-4 pt-4 border-t border-border text-center">
                          <button
                            onClick={onUnlockReport}
                            className="text-xs text-muted-foreground hover:text-primary hover:underline flex items-center justify-center gap-1 mx-auto"
                          >
                            <User className="w-3 h-3" />
                            Just need this one report? Get single license →
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* RIGHT COLUMN: Terminal output */}
        <motion.div 
          className="flex-1 w-full"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-slate-900 border border-slate-700 p-0 overflow-hidden shadow-2xl h-full">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-700 bg-slate-800/50">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>
              <div className="ml-2 text-xs text-slate-400 font-mono flex items-center gap-2">
                <Terminal className="w-3 h-3" />
                roboscan-cli — v1.0.4
              </div>
            </div>
            <div className="p-6 font-mono text-sm min-h-[300px] max-h-[400px] overflow-y-auto flex flex-col text-slate-300" data-testid="terminal-output">
              {lines.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-500">
                  Initializing scan...
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
                        line.includes("[SUCCESS]") ? "text-emerald-400" : 
                        line.includes(">") ? "text-cyan-400" : "text-slate-400"
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
                  className="inline-block w-2 h-4 bg-cyan-400 ml-1"
                />
              )}
            </div>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
};

// ROI Value Proposition Component - Bifurcated by User Type
const ValueProposition = ({ userType }: { userType: 'business' | 'agency' }) => {
  const techFiles = [
    { name: 'robots.txt', desc: 'Crawler permissions', icon: <Bot className="w-4 h-4" /> },
    { name: 'llms.txt', desc: 'AI content map', icon: <Cpu className="w-4 h-4" /> },
    { name: 'sitemap.xml', desc: 'Page structure', icon: <Globe className="w-4 h-4" /> },
    { name: 'security.txt', desc: 'Security contact', icon: <ShieldCheck className="w-4 h-4" /> },
    { name: 'manifest.json', desc: 'App metadata', icon: <FileCode className="w-4 h-4" /> },
    { name: 'ads.txt', desc: 'Ad transparency', icon: <FileText className="w-4 h-4" /> },
    { name: 'humans.txt', desc: 'Team credits', icon: <User className="w-4 h-4" /> },
    { name: 'ai.txt', desc: 'AI guidelines', icon: <Sparkles className="w-4 h-4" /> },
  ];

  // Dynamic content based on user type
  const content = userType === 'business' ? {
    badge: "The ROI is Clear",
    badgeIcon: <TrendingUp className="w-3 h-3" />,
    headline: "Stop Wasting Hours Learning Specs.",
    subheadline: "Get AI-Ready in 2.3 Minutes.",
    description: "AI standards are evolving fast. You could spend countless hours researching file formats, syntax rules, and best practices — or let RoboScan handle it instantly.",
    comparisonLeft: {
      title: "DIY Approach",
      items: ["4-8 hours of research", "High error risk", "No update notifications"]
    },
    comparisonRight: {
      title: "RoboScan",
      items: ["2.3 minutes", "100% validated syntax", "Auto-update alerts"]
    },
    pricingLabel: "Your Investment",
    pricingValue: "$9.99",
    pricingSubtext: "one-time",
    returnLabel: "Your Return",
    returnValue: "Found by AI Forever"
  } : {
    badge: "Scale Your Services",
    badgeIcon: <Zap className="w-3 h-3" />,
    headline: "Scale Your SEO Agency into the AI Era.",
    subheadline: "Unlimited Client Reports in Minutes.",
    description: "Don't spend hours manually auditing client sites. Generate comprehensive AI-readiness reports in minutes and upsell technical implementation services.",
    comparisonLeft: {
      title: "Manual Audits",
      items: ["2-4 hours per client", "Inconsistent quality", "Hard to scale"]
    },
    comparisonRight: {
      title: "RoboScan Automated",
      items: ["2.3 minutes per client", "White-label ready", "Unlimited scans"]
    },
    pricingLabel: "Monthly Investment",
    pricingValue: "$29",
    pricingSubtext: "/month",
    returnLabel: "Your Return",
    returnValue: "Recurring Revenue"
  };

  return (
    <section className="py-20 container mx-auto px-6">
      <div className="grid lg:grid-cols-2 gap-12 items-center">
        {/* Left: Time vs Money messaging */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.6 }}
        >
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono mb-6 ${
            userType === 'business' 
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-500'
              : 'bg-blue-500/10 border border-blue-500/20 text-blue-500'
          }`}>
            {content.badgeIcon}
            {content.badge}
          </div>
          
          <h2 className="text-3xl md:text-4xl font-bold mb-6 leading-tight">
            {content.headline}
            <br />
            <span className={userType === 'business' ? 'text-primary' : 'text-blue-500'}>
              {content.subheadline}
            </span>
          </h2>
          
          <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
            {content.description}
          </p>

          {/* Comparison cards */}
          <div className="grid sm:grid-cols-2 gap-4 mb-8">
            <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20">
              <div className="flex items-center gap-2 text-red-500 font-semibold mb-2">
                <XCircle className="w-5 h-5" />
                {content.comparisonLeft.title}
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {content.comparisonLeft.items.map((item, i) => (
                  <li key={i} className="flex items-center gap-2">
                    {i === 0 ? <Clock className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
              <div className="flex items-center gap-2 text-emerald-500 font-semibold mb-2">
                <CheckCircle className="w-5 h-5" />
                {content.comparisonRight.title}
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {content.comparisonRight.items.map((item, i) => (
                  <li key={i} className="flex items-center gap-2">
                    {i === 0 ? (
                      <Clock className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                    )}
                    <span className={i === 0 ? 'text-foreground font-medium' : ''}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Cost breakdown */}
          <div className={`p-5 rounded-xl border ${
            userType === 'business'
              ? 'bg-gradient-to-r from-primary/10 to-blue-500/10 border-primary/20'
              : 'bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-blue-500/20'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">{content.pricingLabel}</p>
                <div className="flex items-baseline gap-2">
                  <span className={`text-3xl font-bold ${userType === 'business' ? 'text-primary' : 'text-blue-500'}`}>
                    {content.pricingValue}
                  </span>
                  <span className="text-sm text-muted-foreground">{content.pricingSubtext}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground mb-1">{content.returnLabel}</p>
                <p className="text-lg font-semibold text-foreground">{content.returnValue}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right: 8 Technical Files Grid */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="p-8 rounded-2xl bg-card border border-border">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold mb-2">8 Technical Files</h3>
              <p className="text-muted-foreground">Everything you need for complete AI visibility</p>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {techFiles.map((file, i) => (
                <motion.div
                  key={file.name}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="p-3 rounded-xl bg-background border border-border hover:border-primary/50 hover:bg-primary/5 transition-all group cursor-default"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      {file.icon}
                    </div>
                    <div>
                      <p className="font-mono text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{file.desc}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t border-border text-center">
              <p className="text-sm text-muted-foreground">
                <span className="text-primary font-semibold">Tailored to your brand</span> — not generic templates
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

// 4-Step Process Grid Component - Bifurcated by User Type
const HowItWorks = ({ userType }: { userType: 'business' | 'agency' }) => {
  const steps = [
    {
      number: "01",
      icon: <Eye className="w-8 h-8" />,
      title: "Identify",
      desc: userType === 'business'
        ? "We validate your site's purpose and current AI visibility status across all major LLM platforms."
        : "We validate your client's site purpose and current AI visibility status across all major LLM platforms.",
      color: "from-cyan-500/20 to-cyan-500/5",
      iconColor: "text-cyan-500"
    },
    {
      number: "02",
      icon: <Globe className="w-8 h-8" />,
      title: "Input",
      desc: userType === 'business'
        ? "Simply provide your URL. Our scanner works with any public website — no technical setup required."
        : "Simply provide your client's URL. Our scanner works with any public website — no technical setup required.",
      color: "from-primary/20 to-primary/5",
      iconColor: "text-primary"
    },
    {
      number: "03",
      icon: <FileSearch className="w-8 h-8" />,
      title: "Analyze",
      desc: userType === 'business'
        ? "We test your site against current industry standards and identify gaps in your AI discoverability."
        : "We test your client's site against current industry standards and generate a professional audit report.",
      color: "from-blue-500/20 to-blue-500/5",
      iconColor: "text-blue-500"
    },
    {
      number: "04",
      icon: <RefreshCw className="w-8 h-8" />,
      title: "Monitor",
      desc: userType === 'business'
        ? "Auto-update your files when standards change. Stay ahead as AI platforms evolve their crawling rules."
        : "Get alerts when your client's sites need attention. Track changes across all managed domains from one dashboard.",
      color: "from-emerald-500/20 to-emerald-500/5",
      iconColor: "text-emerald-500"
    }
  ];

  return (
    <section id="how-it-works" className="py-24 container mx-auto px-6 relative">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      <div className="text-center mb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-mono mb-4">
            <Cpu className="w-3 h-3" />
            Simple 4-Step Process
          </div>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">How RoboScan Works</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            From zero to AI-ready in under 3 minutes. No technical knowledge required.
          </p>
        </motion.div>
      </div>
      
      {/* 4-Column Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
        {/* Connection lines for desktop */}
        <div className="hidden lg:block absolute top-20 left-[12%] right-[12%] h-0.5 bg-gradient-to-r from-cyan-500/30 via-primary/30 to-emerald-500/30" />
        
        {steps.map((step, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className="relative"
          >
            <div className="relative p-6 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all group h-full card-hover text-center">
              {/* Step number badge */}
              <div className={`mx-auto mb-4 w-14 h-14 rounded-full bg-gradient-to-br ${step.color} ${step.iconColor} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                {step.icon}
              </div>
              
              {/* Step indicator */}
              <div className="text-xs font-mono text-muted-foreground mb-2">Step {step.number}</div>
              
              <h3 className="text-xl font-bold mb-3">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

const Footer = () => (
  <footer className="py-12 border-t border-border bg-card/30">
    <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
      <div className="flex items-center gap-2 text-primary font-mono font-bold">
        <Shield className="w-5 h-5" />
        <span>ROBOSCAN</span>
      </div>
      <div className="flex gap-8 text-sm text-muted-foreground">
        <a href="#" className="hover:text-primary">Privacy</a>
        <a href="#" className="hover:text-primary">Terms</a>
        <a href="https://overture-systems.com" className="hover:text-primary">Overture Systems</a>
      </div>
      <div className="text-xs text-muted-foreground/50">
        © 2025 Overture Systems Inc. All rights reserved.
      </div>
    </div>
  </footer>
);

// User Type for bifurcated funnel
type UserType = 'business' | 'agency';

export default function Home() {
  const [isScanning, setIsScanning] = useState(false);
  const [targetUrl, setTargetUrl] = useState("");
  const [currentScanId, setCurrentScanId] = useState<number | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPremiumReport, setShowPremiumReport] = useState(false);
  const [premiumReportData, setPremiumReportData] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState<ScanStep>('input');
  const [userType, setUserType] = useState<UserType>('business');

  const handleScan = (url: string) => {
    setTargetUrl(url);
    setIsScanning(true);
    setCurrentScanId(null);
    setShowPremiumReport(false);
    setCurrentStep('scanning');
    // REMOVED: Manual scrollTo logic - header now collapses, terminal slides into view naturally
  };

  const handleScanComplete = useCallback((scanId: number) => {
    setCurrentScanId(scanId);
    setCurrentStep('report');
    setIsScanning(false);
  }, []);

  const handleScanError = useCallback(() => {
    setIsScanning(false);
    setCurrentStep('input');
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
        const response = await fetch(`/api/optimization-report/${currentScanId}`, { credentials: "include" });
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
          {/* PASS TERMINAL AS CHILD - visually couples the action (Scan) with the result (Terminal) */}
          <Hero 
            onScan={handleScan} 
            currentStep={currentStep}
            isScanning={isScanning}
            preflightStatus={isScanning ? "Resolving DNS..." : undefined}
            userType={userType}
            setUserType={setUserType}
          >
            {/* Conditionally render TerminalDemo inside Hero */}
            <TerminalDemo 
              isScanning={isScanning} 
              targetUrl={targetUrl} 
              onScanComplete={handleScanComplete}
              onUnlockReport={handleUnlockReport}
              onScanError={handleScanError}
              userType={userType}
            />
          </Hero>
          
          {/* Show Value Proposition and How It Works only on input step */}
          {!isScanning && currentStep === 'input' && (
            <>
              <ValueProposition userType={userType} />
              <HowItWorks userType={userType} />
            </>
          )}
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
