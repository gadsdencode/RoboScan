import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Shield, 
  Menu, 
  X, 
  LayoutDashboard, 
  Wrench,
  ChevronDown,
  Bot,
  FileCode,
  MapPin,
  ShieldCheck,
  Smartphone,
  DollarSign,
  Users,
  Brain,
  GitCompare,
  Sparkles,
  ArrowRight,
  CheckCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";

// Builder tools configuration
const BUILDER_TOOLS = [
  {
    name: "robots.txt",
    description: "Control how search engines crawl your site",
    href: "/robots-builder",
    icon: Bot,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    name: "llms.txt",
    description: "Guide AI agents on citing your content",
    href: "/llms-builder",
    icon: FileCode,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    name: "sitemap.xml",
    description: "Help search engines discover your pages",
    href: "/sitemap-builder",
    icon: MapPin,
    color: "text-cyan-500",
    bgColor: "bg-cyan-500/10",
  },
  {
    name: "security.txt",
    description: "RFC 9116 security disclosure contact",
    href: "/security-builder",
    icon: ShieldCheck,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
  },
  {
    name: "manifest.json",
    description: "Make your site a Progressive Web App",
    href: "/manifest-builder",
    icon: Smartphone,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  {
    name: "ads.txt",
    description: "Declare authorized ad sellers (IAB)",
    href: "/ads-builder",
    icon: DollarSign,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
  {
    name: "humans.txt",
    description: "Credit the team behind your website",
    href: "/humans-builder",
    icon: Users,
    color: "text-pink-500",
    bgColor: "bg-pink-500/10",
  },
  {
    name: "ai.txt",
    description: "Control AI training & scraping permissions",
    href: "/ai-builder",
    icon: Brain,
    color: "text-violet-500",
    bgColor: "bg-violet-500/10",
  },
];

interface NavbarProps {
  showDashboard?: boolean;
  toolbarItems?: React.ReactNode;
  onCompareSites?: () => void;
}

// Signup prompt benefits - focused on value proposition
const SIGNUP_BENEFITS = [
  "Generate all 8 technical files instantly",
  "Download & export production-ready files",
  "Get AI visibility score & recommendations",
  "Priority support & continuous updates",
];

export function Navbar({ showDashboard = true, toolbarItems, onCompareSites }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showSignupPrompt, setShowSignupPrompt] = useState(false);
  const [selectedTool, setSelectedTool] = useState<typeof BUILDER_TOOLS[0] | null>(null);
  const { isAuthenticated, isLoading } = useAuth();

  // Handle tool click - check auth and either navigate or show prompt
  const handleToolClick = (tool: typeof BUILDER_TOOLS[0]) => {
    if (isLoading) return;
    
    if (isAuthenticated) {
      window.location.href = tool.href;
    } else {
      setSelectedTool(tool);
      setShowSignupPrompt(true);
    }
  };


  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        {/* Brand / Logo */}
        <div 
          className="flex items-center gap-2 text-primary font-heading text-xl font-bold tracking-tighter cursor-pointer" 
          onClick={() => window.location.href = '/'}
        >
          <Shield className="w-6 h-6" />
          <span>ROBOSCAN</span>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-2">
          {/* Additional Toolbar Items */}
          {toolbarItems}

          {/* Tools Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="text-muted-foreground hover:text-primary hover:bg-primary/10 font-medium gap-2 transition-all"
                data-testid="button-tools-dropdown"
              >
                <Wrench className="w-4 h-4" />
                Tools
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-primary" />
                Technical File Builders
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="grid gap-1 p-1">
                {BUILDER_TOOLS.map((tool) => {
                  const IconComponent = tool.icon;
                  return (
                    <DropdownMenuItem
                      key={tool.href}
                      className="flex items-start gap-3 p-3 cursor-pointer focus:bg-accent rounded-md group"
                      onClick={() => handleToolClick(tool)}
                    >
                      <div className={`p-2 rounded-md ${tool.bgColor} transition-transform group-hover:scale-110`}>
                        <IconComponent className={`w-4 h-4 ${tool.color}`} />
                      </div>
                      <div className="flex flex-col gap-0.5 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{tool.name}</span>
                          {!isAuthenticated && !isLoading && (
                            <Sparkles className="w-3 h-3 text-amber-500 opacity-60" />
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {tool.description}
                        </span>
                      </div>
                    </DropdownMenuItem>
                  );
                })}
              </div>
              
              {/* Compare Sites - Analysis Tool */}
              {onCompareSites && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="flex items-center gap-2">
                    <GitCompare className="w-4 h-4 text-primary" />
                    Analysis Tools
                  </DropdownMenuLabel>
                  <div className="p-1">
                    <DropdownMenuItem
                      className="flex items-start gap-3 p-3 cursor-pointer focus:bg-accent rounded-md"
                      onClick={onCompareSites}
                      data-testid="button-compare-sites"
                    >
                      <div className="p-2 rounded-md bg-orange-500/10">
                        <GitCompare className="w-4 h-4 text-orange-500" />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-sm">Compare Sites</span>
                        <span className="text-xs text-muted-foreground">
                          Analyze competitors' AI & SEO strategies
                        </span>
                      </div>
                    </DropdownMenuItem>
                  </div>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Dashboard Button */}
          {showDashboard && (
            <Button 
              variant="ghost"
              className="text-muted-foreground hover:text-primary hover:bg-primary/10 font-medium gap-2 transition-all"
              onClick={() => window.location.href = '/login'}
              data-testid="nav-dashboard-login"
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </Button>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button 
          className="md:hidden text-foreground p-2" 
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-background border-b border-border overflow-hidden"
          >
            <div className="flex flex-col p-6 gap-4">
              {/* Tools Section */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Wrench className="w-3 h-3" />
                  File Builders
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {BUILDER_TOOLS.map((tool) => {
                    const IconComponent = tool.icon;
                    return (
                      <Button
                        key={tool.href}
                        variant="outline"
                        className="justify-start gap-2 h-auto py-3 px-3 relative"
                        onClick={() => {
                          setIsOpen(false);
                          handleToolClick(tool);
                        }}
                      >
                        <IconComponent className={`w-4 h-4 ${tool.color}`} />
                        <span className="text-xs font-medium truncate">{tool.name}</span>
                        {!isAuthenticated && !isLoading && (
                          <Sparkles className="w-3 h-3 text-amber-500 absolute top-1 right-1" />
                        )}
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* Compare Sites - Mobile */}
              {onCompareSites && (
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <GitCompare className="w-3 h-3" />
                    Analysis
                  </span>
                  <Button
                    variant="outline"
                    className="justify-start gap-2"
                    onClick={() => {
                      setIsOpen(false);
                      onCompareSites();
                    }}
                  >
                    <GitCompare className="w-4 h-4 text-orange-500" />
                    Compare Sites
                  </Button>
                </div>
              )}

              {/* Dashboard Section */}
              {showDashboard && (
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Account
                  </span>
                  <Button 
                    className="w-full justify-start gap-2"
                    variant="outline"
                    onClick={() => {
                      setIsOpen(false);
                      window.location.href = '/login';
                    }}
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    Dashboard Login
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Signup Prompt Dialog */}
      <Dialog open={showSignupPrompt} onOpenChange={setShowSignupPrompt}>
        <DialogContent className="sm:max-w-md border-primary/20">
          <DialogHeader className="text-center space-y-4">
            {selectedTool && (
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="mx-auto"
              >
                <div className={`w-20 h-20 rounded-2xl ${selectedTool.bgColor} flex items-center justify-center mx-auto mb-2 shadow-lg`}>
                  <selectedTool.icon className={`w-10 h-10 ${selectedTool.color}`} />
                </div>
              </motion.div>
            )}
            <div className="space-y-2">
              <DialogTitle className="text-2xl font-bold">
                {selectedTool ? `Unlock ${selectedTool.name} Builder` : 'Unlock Premium Tools'}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-base">
                Create an account to access our professional-grade file generators
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="space-y-5 py-4">
            {/* Benefits List */}
            <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-5 space-y-3 border border-primary/10">
              <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                What's included:
              </p>
              {SIGNUP_BENEFITS.map((benefit, i) => (
                <motion.div 
                  key={benefit}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-3 text-sm text-muted-foreground"
                >
                  <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  <span>{benefit}</span>
                </motion.div>
              ))}
            </div>

            {/* Pricing hint */}
            <div className="text-center bg-amber-500/10 rounded-lg py-2 px-4 border border-amber-500/20">
              <p className="text-sm text-foreground font-medium">
                Guardian Plan: <span className="font-bold text-primary">$29/month</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Full access to all tools & premium features
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="space-y-3">
              <Button 
                className="w-full h-12 text-base font-semibold gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25"
                onClick={() => window.location.href = '/pricing'}
              >
                <Sparkles className="w-4 h-4" />
                Subscribe Now — $29/mo
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Already have account */}
            <p className="text-center text-sm text-muted-foreground">
              Already a subscriber?{" "}
              <a 
                href="/login" 
                className="text-primary hover:underline font-semibold"
              >
                Sign in to access
              </a>
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </nav>
  );
}

export default Navbar;

