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
  GitCompare
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

export function Navbar({ showDashboard = true, toolbarItems, onCompareSites }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);

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
                      className="flex items-start gap-3 p-3 cursor-pointer focus:bg-accent rounded-md"
                      onClick={() => window.location.href = tool.href}
                    >
                      <div className={`p-2 rounded-md ${tool.bgColor}`}>
                        <IconComponent className={`w-4 h-4 ${tool.color}`} />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-sm">{tool.name}</span>
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
                        className="justify-start gap-2 h-auto py-3 px-3"
                        onClick={() => {
                          setIsOpen(false);
                          window.location.href = tool.href;
                        }}
                      >
                        <IconComponent className={`w-4 h-4 ${tool.color}`} />
                        <span className="text-xs font-medium truncate">{tool.name}</span>
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
    </nav>
  );
}

export default Navbar;

