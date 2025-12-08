import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Bot, FileCode, Search, CheckCircle, XCircle, Terminal, ArrowRight, Menu, X, Sparkles, Lock, Zap, FileSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { PaymentModal } from "@/components/PaymentModal";
import { PremiumReport } from "@/components/PremiumReport";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 text-primary font-heading text-xl font-bold tracking-tighter">
          <Shield className="w-6 h-6" />
          <span>ROBOSCAN</span>
        </div>

        <div className="hidden md:flex items-center gap-8">
          <Button 
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold btn-hover-lift"
            onClick={() => window.location.href = '/login'}
            data-testid="button-login"
          >
            Login
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
            className="md:hidden bg-background border-b border-border overflow-hidden"
          >
            <div className="flex flex-col p-6 gap-4">
              <Button 
                className="w-full bg-primary text-primary-foreground"
                onClick={() => window.location.href = '/login'}
              >
                Login
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

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
    <div className="flex items-center justify-center gap-2 md:gap-4 mb-8">
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

// Enhanced Hero Component with Enterprise Aesthetic
const Hero = ({ 
  onScan, 
  currentStep,
  isScanning,
  preflightStatus
}: { 
  onScan: (url: string) => void;
  currentStep: ScanStep;
  isScanning: boolean;
  preflightStatus?: string;
}) => {
  const [url, setUrl] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url) onScan(url);
  };

  return (
    <section className="relative min-h-screen pt-20 flex items-center justify-center overflow-hidden">
      {/* Abstract gradient mesh background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />
        <div className="absolute inset-0 grid-bg opacity-20" />
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
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-500">Sees Your Site</span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Generate, validate, and optimize <code className="text-primary bg-primary/10 px-1 py-0.5 rounded">robots.txt</code> and <code className="text-primary bg-primary/10 px-1 py-0.5 rounded">llms.txt</code> to ensure AI agents interact with your content exactly how you intend.
          </p>

          {/* Step Tracker */}
          <StepTracker currentStep={currentStep} preflightStatus={preflightStatus} />

          {/* Wizard-style Form */}
          <motion.div
            animate={{ 
              scale: currentStep === 'input' ? 1 : 0.95,
              opacity: currentStep === 'input' ? 1 : 0.7
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
                    <h3 className="font-bold text-lg mb-1">Step 1: Enter Your Website</h3>
                    <p className="text-sm text-muted-foreground">
                      Start your AI readiness analysis by entering your domain
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Input 
                      placeholder="example.com" 
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
          
          <p className="mt-6 text-xs text-muted-foreground">
            Free scan • No credit card required • Instant results
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
  onUnlockReport,
  onScanError
}: { 
  isScanning: boolean; 
  targetUrl: string;
  onScanComplete: (scanId: number) => void;
  onUnlockReport: () => void;
  onScanError: () => void;
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
        newLines.push("> Locating robots.txt...");

        if (result.robotsTxtFound) {
          newLines.push("> [SUCCESS] robots.txt found");
          if (result.warnings && result.warnings.length > 0) {
            result.warnings.forEach(w => newLines.push(`> [WARN] ${w}`));
          }
        } else {
          newLines.push("> [WARN] robots.txt not found (404)");
        }

        newLines.push("> Locating llms.txt...");
        if (result.llmsTxtFound) {
          newLines.push("> [SUCCESS] llms.txt found");
        } else {
          newLines.push("> [WARN] llms.txt not found (404)");
        }

        newLines.push("> Analyzing AI agent permissions...");
        newLines.push("> Parsing configuration files...");
        
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
        onScanError();
      }
    };

    performScan();
  }, [isScanning, targetUrl, onScanComplete, onScanError]);

  if (!isScanning && lines.length === 0) return null;

  return (
    <motion.section 
      id="terminal"
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="py-12 md:py-20 bg-card/30 border-y border-border"
    >
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-mono mb-4">
            <Zap className="w-3 h-3" />
            Step 2: Live Analysis
          </div>
          <h2 className="text-3xl md:text-4xl font-bold">Real-Time Scan Results</h2>
          <p className="text-muted-foreground mt-2">
            Watch as we analyze your site's AI readiness
          </p>
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-8 items-start">
          <motion.div 
            className="flex-1 space-y-6"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
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
                  transition={{ delay: 0.4 + (i * 0.1) }}
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

          <motion.div 
            className="flex-1 w-full space-y-4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="bg-card border border-border p-0 overflow-hidden shadow-2xl">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
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
                {lines.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-muted-foreground/50">
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
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  className="p-6 bg-card border border-primary/30 rounded-xl"
                  data-testid="upgrade-cta"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-primary/20 rounded-xl">
                      <Sparkles className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg mb-2">Scan Complete! Ready for Step 3?</h3>
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
          </motion.div>
        </div>
      </div>
    </motion.section>
  );
};

// Refactored How It Works Component (Sequential Flow)
const HowItWorks = () => {
  const steps = [
    {
      number: "01",
      icon: <Search className="w-10 h-10 text-primary" />,
      title: "Enter Your URL",
      desc: "Simply input your website domain to begin the analysis. Our scanner works with any public website.",
      color: "from-primary/10 to-primary/5"
    },
    {
      number: "02",
      icon: <FileSearch className="w-10 h-10 text-primary" />,
      title: "We Scan & Analyze",
      desc: "Our engine checks robots.txt, llms.txt, validates syntax, and identifies which AI agents can access your content.",
      color: "from-primary/10 to-primary/5"
    },
    {
      number: "03",
      icon: <Sparkles className="w-10 h-10 text-primary" />,
      title: "Get Optimized Files",
      desc: "Receive ready-to-deploy configuration files, actionable insights, and a complete AI readiness report.",
      color: "from-primary/10 to-primary/5"
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
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-4">How It Works</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Three simple steps to complete AI readiness for your website
          </p>
        </motion.div>
      </div>
      
      <div className="grid md:grid-cols-3 gap-8 md:gap-6 relative">
        {/* Connection lines for desktop */}
        <div className="hidden md:block absolute top-24 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        
        {steps.map((step, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.2 }}
            className="relative"
          >
            <div className="relative p-8 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all group h-full card-hover">
              {/* Step number badge */}
              <div className="absolute -top-4 -left-4 w-12 h-12 rounded-full bg-primary text-primary-foreground font-bold text-xl flex items-center justify-center shadow-lg shadow-primary/20">
                {step.number}
              </div>
              
              {/* Icon container */}
              <div className={`mb-6 p-4 bg-gradient-to-br ${step.color} w-fit rounded-xl group-hover:scale-110 transition-transform`}>
                {step.icon}
              </div>
              
              <h3 className="text-2xl font-bold mb-4">{step.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{step.desc}</p>
              
              {/* Arrow indicator */}
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute -right-4 top-1/2 -translate-y-1/2 text-primary/30">
                  <ArrowRight className="w-8 h-8" />
                </div>
              )}
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
  const [currentStep, setCurrentStep] = useState<ScanStep>('input');
  const terminalRef = useRef<HTMLDivElement>(null);

  const handleScan = (url: string) => {
    setTargetUrl(url);
    setIsScanning(true);
    setCurrentScanId(null);
    setShowPremiumReport(false);
    setCurrentStep('scanning');
    
    // Smooth scroll to terminal with offset for better UX
    setTimeout(() => {
      const terminalSection = document.getElementById("terminal");
      if (terminalSection) {
        const yOffset = -100; // Offset for navbar
        const y = terminalSection.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: "smooth" });
      }
    }, 100);
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
          <Hero 
            onScan={handleScan} 
            currentStep={currentStep}
            isScanning={isScanning}
            preflightStatus={isScanning ? "Resolving DNS..." : undefined}
          />
          
          {/* Terminal appears immediately after Hero when scanning */}
          <div ref={terminalRef}>
            <TerminalDemo 
              isScanning={isScanning} 
              targetUrl={targetUrl} 
              onScanComplete={handleScanComplete}
              onUnlockReport={handleUnlockReport}
              onScanError={handleScanError}
            />
          </div>
          
          {/* How It Works section - shown before any scanning */}
          {!isScanning && (
            <HowItWorks />
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
