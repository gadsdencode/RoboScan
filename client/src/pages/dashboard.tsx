import { useState, useEffect } from "react";
import { Shield, LogOut, Search, ArrowRight, Bot, Bell, GitCompare, HelpCircle, Trophy, AlertCircle, Sparkles, Settings } from "lucide-react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { dashboardTourSteps } from "@/lib/tour-config";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useScan } from "@/hooks/useScan";
import { PaymentModal } from "@/components/PaymentModal";
import { ScanComparison } from "@/components/ScanComparison";
import { CompactUserHUD } from "@/components/CompactUserHUD";
import { TrophyCase } from "@/components/TrophyCase";
import { ScanDetailsModal } from "@/components/ScanDetailsModal";
import { RecurringScans, type RecurringScan } from "@/components/dashboard/RecurringScans";
import { NotificationSheet, type Notification } from "@/components/dashboard/NotificationSheet";
import { ScanList, type ScanWithPurchase } from "@/components/dashboard/ScanList";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import type { Scan } from "@shared/schema";

interface NotificationPreferences {
  id: number;
  recurringScanId: number;
  notifyOnRobotsTxtChange: boolean;
  notifyOnLlmsTxtChange: boolean;
  notifyOnBotPermissionChange: boolean;
  notifyOnNewErrors: boolean;
  notificationMethod: 'in-app' | 'email' | 'both';
}

export default function Dashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { mutate: scanUrl, isPending: isScanningMutation } = useScan();
  const [scans, setScans] = useState<ScanWithPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedScan, setSelectedScan] = useState<ScanWithPurchase | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showTrophyCase, setShowTrophyCase] = useState(false);
  const [showScanDetailsModal, setShowScanDetailsModal] = useState(false);
  const [scanDetailsData, setScanDetailsData] = useState<ScanWithPurchase | null>(null);
  const [loadingScanId, setLoadingScanId] = useState<number | null>(null);
  const [expandedScan, setExpandedScan] = useState<number | null>(null);
  const [scanUrlInput, setScanUrlInput] = useState("");
  const [scanError, setScanError] = useState<string | null>(null);

  // Recurring scans state
  const [recurringScans, setRecurringScans] = useState<RecurringScan[]>([]);
  const [showCreateRecurringDialog, setShowCreateRecurringDialog] = useState(false);
  const [newRecurringUrl, setNewRecurringUrl] = useState("");
  const [newRecurringFrequency, setNewRecurringFrequency] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [isCreatingRecurring, setIsCreatingRecurring] = useState(false);

  // Notifications state
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotificationsSheet, setShowNotificationsSheet] = useState(false);

  // Notification preferences state
  const [showPreferencesDialog, setShowPreferencesDialog] = useState(false);
  const [selectedRecurringScan, setSelectedRecurringScan] = useState<RecurringScan | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);

  // Comparison state
  const [comparisonMode, setComparisonMode] = useState(false);
  const [selectedScanForComparison, setSelectedScanForComparison] = useState<ScanWithPurchase | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonOldScan, setComparisonOldScan] = useState<ScanWithPurchase | null>(null);
  const [comparisonNewScan, setComparisonNewScan] = useState<ScanWithPurchase | null>(null);
  const [comparisonLabels, setComparisonLabels] = useState<[string, string]>(["Previous Scan", "Current Scan"]);

  // Competitor comparison state
  const [showCompetitorDialog, setShowCompetitorDialog] = useState(false);
  const [competitorUrl, setCompetitorUrl] = useState("");
  const [myUrlForCompare, setMyUrlForCompare] = useState("");
  const [isAnalyzingCompetitor, setIsAnalyzingCompetitor] = useState(false);
  const [competitorError, setCompetitorError] = useState<string | null>(null);

  // Tag management state
  const [allTags, setAllTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showTagFilter, setShowTagFilter] = useState(false);

  // Bot access testing state
  const [botAccessTests, setBotAccessTests] = useState<Record<string, { status: number; accessible: boolean; statusText: string; loading?: boolean }>>({});
  const [testingBots, setTestingBots] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchScans();
    fetchRecurringScans();
    fetchNotifications();
    fetchUnreadCount();
    fetchAllTags();

    // Poll for notifications every 30 seconds
    const interval = setInterval(() => {
      fetchNotifications();
      fetchUnreadCount();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Tour Handler
  const runTour = () => {
    const driverObj = driver({
      showProgress: true,
      steps: dashboardTourSteps,
      popoverClass: 'roboscan-driver-popover',
      onDestroyed: () => {
        localStorage.setItem('roboscan_tour_seen', 'true');
      }
    });
    
    driverObj.drive();
  };

  // Auto-start tour for new users
  useEffect(() => {
    const hasSeenTour = localStorage.getItem('roboscan_tour_seen');
    if (!hasSeenTour && !loading && scans.length === 0) {
      setTimeout(runTour, 1000);
    }
  }, [loading, scans.length]);

  const fetchScans = async (tagFilter?: string[]) => {
    try {
      const params = new URLSearchParams();
      if (tagFilter && tagFilter.length > 0) {
        tagFilter.forEach(tag => params.append('tags', tag));
      }
      const queryString = params.toString();
      const url = queryString ? `/api/user/scans?${queryString}` : '/api/user/scans';
      
      const response = await fetch(url, { credentials: "include" });
      if (response.ok) {
        const data = await response.json();
        // Handle new response format: { scans, meta } OR legacy array format
        const scanData = Array.isArray(data) ? data : (data.scans || []);
        setScans(scanData);
      }
    } catch (error) {
      console.error('Failed to fetch scans:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllTags = async () => {
    try {
      const response = await fetch('/api/user/tags', { credentials: "include" });
      if (response.ok) {
        const data = await response.json();
        setAllTags(data);
      }
    } catch (error) {
      console.error('Failed to fetch tags:', error);
    }
  };

  const fetchRecurringScans = async () => {
    try {
      const response = await fetch('/api/recurring-scans', { credentials: "include" });
      if (response.ok) {
        const data = await response.json();
        setRecurringScans(data);
      }
    } catch (error) {
      console.error('Failed to fetch recurring scans:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications', { credentials: "include" });
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await fetch('/api/notifications/unread-count', { credentials: "include" });
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.count);
      }
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  };

  const handleUnlock = (scan: ScanWithPurchase) => {
    setSelectedScan(scan);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    fetchScans();
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

  const testBotAccess = async (scanUrl: string, botName: string) => {
    const testKey = `${scanUrl}-${botName}`;
    
    setTestingBots(prev => new Set(prev).add(testKey));
    
    try {
      const response = await fetch('/api/test-bot-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: scanUrl, botName }),
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setBotAccessTests(prev => ({
          ...prev,
          [testKey]: {
            status: data.status,
            accessible: data.accessible,
            statusText: data.statusText,
          },
        }));
      }
    } catch (error) {
      console.error('Failed to test bot access:', error);
      setBotAccessTests(prev => ({
        ...prev,
        [testKey]: {
          status: 0,
          accessible: false,
          statusText: 'Test failed',
        },
      }));
    } finally {
      setTestingBots(prev => {
        const next = new Set(prev);
        next.delete(testKey);
        return next;
      });
    }
  };

  const handleScan = () => {
    if (!scanUrlInput.trim()) return;
    setScanError(null);

    scanUrl(scanUrlInput, {
      onSuccess: (data) => {
        // Gamification: Show XP gained toast
        if (data.gamification && user) {
          const { xpGained, totalXp, newLevel, levelUp, cooldownActive } = data.gamification;
          
          if (cooldownActive) {
            toast.info('Domain cooldown active', {
              description: 'You\'ve already scanned this domain recently. No XP awarded this time.',
              duration: 3000,
            });
          } else if (levelUp) {
            // Level up celebration!
            toast.success(`🎉 Level Up! You're now Level ${newLevel}!`, {
              description: `You earned ${xpGained} XP and reached a new level! Keep scanning!`,
              duration: 5000,
            });
          } else {
            // Regular XP gain
            const isPerfectScan = xpGained >= 50;
            toast.success(
              isPerfectScan 
                ? `✨ Perfect Scan! +${xpGained} XP` 
                : `+${xpGained} XP earned`,
              {
                description: isPerfectScan 
                  ? `Both robots.txt and llms.txt found! Total: ${totalXp} XP`
                  : `Total XP: ${totalXp}`,
                duration: 3000,
              }
            );
          }
        }
        
        fetchScans();
        setScanUrlInput("");
      },
      onError: (error) => {
        setScanError(error instanceof Error ? error.message : 'Failed to scan website');
      }
    });
  };

  const handleCreateRecurringScan = async () => {
    if (!newRecurringUrl.trim()) return;

    setIsCreatingRecurring(true);

    try {
      const response = await fetch('/api/recurring-scans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          url: newRecurringUrl, 
          frequency: newRecurringFrequency 
        }),
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Handle subscription required error
        if (response.status === 403 && errorData.requiresSubscription) {
          toast.error('Subscription Required', {
            description: 'Recurring scans are a Guardian feature. Upgrade to enable automatic monitoring.',
            action: {
              label: 'Upgrade',
              onClick: () => window.location.href = '/pricing',
            },
          });
          setShowCreateRecurringDialog(false);
          return;
        }
        
        throw new Error(errorData.message || 'Failed to create recurring scan');
      }

      await fetchRecurringScans();
      setShowCreateRecurringDialog(false);
      setNewRecurringUrl("");
      setNewRecurringFrequency('daily');
      
      toast.success('Recurring Scan Created', {
        description: `Monitoring ${newRecurringUrl} ${newRecurringFrequency}`,
      });
    } catch (error) {
      console.error('Create recurring scan error:', error);
      toast.error('Failed to create recurring scan', {
        description: error instanceof Error ? error.message : 'Please try again',
      });
    } finally {
      setIsCreatingRecurring(false);
    }
  };

  const handleToggleRecurringScan = async (id: number, currentlyActive: boolean) => {
    try {
      const response = await fetch(`/api/recurring-scans/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !currentlyActive }),
        credentials: "include",
      });

      if (response.ok) {
        await fetchRecurringScans();
      }
    } catch (error) {
      console.error('Toggle recurring scan error:', error);
    }
  };

  const handleDeleteRecurringScan = async (id: number) => {
    if (!confirm('Are you sure you want to delete this recurring scan?')) {
      return;
    }

    try {
      const response = await fetch(`/api/recurring-scans/${id}`, {
        method: 'DELETE',
        credentials: "include",
      });

      if (response.ok) {
        await fetchRecurringScans();
      }
    } catch (error) {
      console.error('Delete recurring scan error:', error);
    }
  };

  const handleMarkNotificationRead = async (id: number) => {
    try {
      const response = await fetch(`/api/notifications/${id}/read`, {
        method: 'PATCH',
        credentials: "include",
      });

      if (response.ok) {
        await fetchNotifications();
        await fetchUnreadCount();
      }
    } catch (error) {
      console.error('Mark notification read error:', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        credentials: "include",
      });

      if (response.ok) {
        await fetchNotifications();
        await fetchUnreadCount();
      }
    } catch (error) {
      console.error('Mark all read error:', error);
    }
  };

  const handleOpenPreferences = async (scan: RecurringScan) => {
    setSelectedRecurringScan(scan);
    
    try {
      const response = await fetch(`/api/recurring-scans/${scan.id}/preferences`, { credentials: "include" });
      if (response.ok) {
        const data = await response.json();
        setPreferences(data);
        setShowPreferencesDialog(true);
      }
    } catch (error) {
      console.error('Fetch preferences error:', error);
    }
  };

  const handleSavePreferences = async () => {
    if (!selectedRecurringScan || !preferences) return;

    setIsSavingPreferences(true);

    try {
      const response = await fetch(`/api/recurring-scans/${selectedRecurringScan.id}/preferences`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notifyOnRobotsTxtChange: preferences.notifyOnRobotsTxtChange,
          notifyOnLlmsTxtChange: preferences.notifyOnLlmsTxtChange,
          notifyOnBotPermissionChange: preferences.notifyOnBotPermissionChange,
          notifyOnNewErrors: preferences.notifyOnNewErrors,
          notificationMethod: preferences.notificationMethod,
        }),
        credentials: "include",
      });

      if (response.ok) {
        setShowPreferencesDialog(false);
        setSelectedRecurringScan(null);
        setPreferences(null);
      }
    } catch (error) {
      console.error('Save preferences error:', error);
    } finally {
      setIsSavingPreferences(false);
    }
  };

  const getFrequencyLabel = (frequency: string) => {
    switch (frequency) {
      case 'daily': return 'Every day';
      case 'weekly': return 'Every week';
      case 'monthly': return 'Every month';
      default: return frequency;
    }
  };

  const formatRelativeTime = (date: string) => {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return then.toLocaleDateString();
  };

  const handleCompareScans = (scan: ScanWithPurchase) => {
    if (!comparisonMode) {
      setComparisonMode(true);
      setSelectedScanForComparison(scan);
    } else {
      if (selectedScanForComparison && selectedScanForComparison.id !== scan.id) {
        // Determine which is older
        const oldScan = new Date(selectedScanForComparison.createdAt) < new Date(scan.createdAt) 
          ? selectedScanForComparison 
          : scan;
        const newScan = new Date(selectedScanForComparison.createdAt) < new Date(scan.createdAt) 
          ? scan 
          : selectedScanForComparison;
        
        setComparisonOldScan(oldScan);
        setComparisonNewScan(newScan);
        setComparisonLabels(["Previous Scan", "Current Scan"]);
        setShowComparison(true);
        setComparisonMode(false);
        setSelectedScanForComparison(null);
      }
    }
  };

  const handleCompetitorAnalysis = async () => {
    if (!competitorUrl.trim() || !myUrlForCompare.trim()) return;
    
    setIsAnalyzingCompetitor(true);
    setCompetitorError(null);
    
    try {
      const resA = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: myUrlForCompare }),
        credentials: "include",
      });

      if (!resA.ok) {
        const errorData = await resA.json().catch(() => ({ message: 'Failed to scan your website' }));
        setCompetitorError(errorData.message || 'Failed to scan your website');
        setIsAnalyzingCompetitor(false);
        return;
      }

      const dataA = await resA.json();
      if (!dataA || !dataA.url) {
        setCompetitorError('Invalid response from your website scan');
        setIsAnalyzingCompetitor(false);
        return;
      }

      const resB = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: competitorUrl }),
        credentials: "include",
      });

      if (!resB.ok) {
        const errorData = await resB.json().catch(() => ({ message: 'Failed to scan competitor website' }));
        setCompetitorError(errorData.message || 'Failed to scan competitor website');
        setIsAnalyzingCompetitor(false);
        return;
      }

      const dataB = await resB.json();
      if (!dataB || !dataB.url) {
        setCompetitorError('Invalid response from competitor website scan');
        setIsAnalyzingCompetitor(false);
        return;
      }

      setComparisonOldScan(dataA);
      setComparisonNewScan(dataB);
      setComparisonLabels(["My Site", "Competitor"]);
      setShowComparison(true);
      setShowCompetitorDialog(false);
      setCompetitorUrl("");
      setMyUrlForCompare("");
      setCompetitorError(null);
      
      fetchScans();
    } catch (error) {
      console.error("Comparison failed", error);
      setCompetitorError(error instanceof Error ? error.message : 'Failed to compare websites. Please try again.');
    } finally {
      setIsAnalyzingCompetitor(false);
    }
  };

  const cancelComparison = () => {
    setComparisonMode(false);
    setSelectedScanForComparison(null);
  };

  const getScansForUrl = (url: string) => {
    return scans.filter(s => s.url === url).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  };

  const handleQuickCompare = (scan: ScanWithPurchase) => {
    const urlScans = getScansForUrl(scan.url);
    if (urlScans.length >= 2) {
      const latest = urlScans[0];
      const previous = urlScans[1];
      setComparisonOldScan(previous);
      setComparisonNewScan(latest);
      setComparisonLabels(["Previous Scan", "Current Scan"]);
      setShowComparison(true);
    }
  };

  const handleToggleTagFilter = async (tag: string) => {
    const newSelectedTags = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag];
    setSelectedTags(newSelectedTags);
    setLoading(true);
    await fetchScans(newSelectedTags.length > 0 ? newSelectedTags : undefined);
    setLoading(false);
  };

  const handleClearTagFilter = async () => {
    setSelectedTags([]);
    setLoading(true);
    await fetchScans();
    setLoading(false);
  };

  const handleAddTag = async (scanId: number, tag: string) => {
    if (!tag.trim()) return;
    
    const scan = scans.find(s => s.id === scanId);
    if (!scan) return;

    const updatedTags = [...(scan.tags || []), tag.trim()];
    
    try {
      const response = await fetch(`/api/scans/${scanId}/tags`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: updatedTags }),
        credentials: "include",
      });

      if (response.ok) {
        await fetchScans(selectedTags.length > 0 ? selectedTags : undefined);
        await fetchAllTags();
        setTagInput("");
      }
    } catch (error) {
      console.error('Failed to add tag:', error);
    }
  };

  const handleRemoveTag = async (scanId: number, tagToRemove: string) => {
    const scan = scans.find(s => s.id === scanId);
    if (!scan) return;

    const updatedTags = (scan.tags || []).filter(t => t !== tagToRemove);
    
    try {
      const response = await fetch(`/api/scans/${scanId}/tags`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: updatedTags }),
        credentials: "include",
      });

      if (response.ok) {
        await fetchScans(selectedTags.length > 0 ? selectedTags : undefined);
        await fetchAllTags();
      }
    } catch (error) {
      console.error('Failed to remove tag:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary font-heading text-xl font-bold tracking-tighter">
            <Shield className="w-6 h-6" />
            <span>ROBOSCAN</span>
          </div>

          <div className="flex items-center gap-4">
            {/* PRIMARY TOOLS - Most important actions come first */}
            
            {/* llms.txt Builder - Primary feature */}
            <Link href="/tools/llms-builder">
              <Button 
                variant="secondary" 
                size="sm"
                className="btn-hover-scale"
                data-testid="button-llms-builder"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                llms.txt Builder
              </Button>
            </Link>

            {/* robots.txt Builder - Primary feature */}
            <Link href="/robots-builder">
              <Button 
                variant="secondary" 
                size="sm"
                className="btn-hover-scale"
                data-testid="button-robots-builder"
              >
                <Bot className="w-4 h-4 mr-2" />
                robots.txt Builder
              </Button>
            </Link>

            {/* Compare Sites - Secondary tool */}
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowCompetitorDialog(true)}
              className="gap-2 btn-hover-scale"
              data-testid="button-compare-sites"
            >
              <GitCompare className="w-4 h-4" />
              Compare Sites
            </Button>

            {/* ENGAGEMENT FEATURES */}
            
            {/* Trophy Case - Gamification */}
            {user && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowTrophyCase(true)}
                className="btn-hover-scale text-muted-foreground hover:text-yellow-400"
                title="View Achievements"
                data-testid="button-trophy-case"
              >
                <Trophy className="w-5 h-5" />
              </Button>
            )}

            {/* SUPPORT */}
            
            {/* Help/Tour Button */}
            <Button 
              variant="ghost" 
              size="icon"
              onClick={runTour}
              className="btn-hover-scale text-muted-foreground hover:text-primary"
              title="Start Feature Tour"
              data-testid="button-tour"
            >
              <HelpCircle className="w-5 h-5" />
            </Button>

            {/* USER-SPECIFIC ITEMS - Always on the right */}
            
            {/* Notifications Bell */}
            <button
              onClick={() => setShowNotificationsSheet(true)}
              className="relative p-2 hover:bg-white/5 rounded-lg transition-smooth btn-hover-scale group"
              data-testid="button-notifications"
            >
              <Bell className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Gamification HUD - User progress */}
            {user && <CompactUserHUD />}

            {/* User Profile */}
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
            
            {/* Logout - Account action */}
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.location.href = '/api/logout'}
              className="border-border btn-hover-scale"
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
        <Card className="p-6 bg-card border border-border mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Search className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold">Scan a New Website</h2>
          </div>
          <div className="flex gap-3">
            <Input
              type="url"
              placeholder="Enter website URL (e.g., example.com)"
              value={scanUrlInput}
              onChange={(e) => setScanUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !isScanningMutation && handleScan()}
              disabled={isScanningMutation}
              className="flex-1 bg-background border-border focus:border-primary"
              data-testid="input-scan-url"
            />
            <Button
              onClick={handleScan}
              disabled={isScanningMutation || !scanUrlInput.trim()}
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 btn-hover-lift"
              data-testid="button-scan"
            >
              {isScanningMutation ? (
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

        {/* Recurring Scans Section */}
        <RecurringScans
          recurringScans={recurringScans}
          showCreateRecurringDialog={showCreateRecurringDialog}
          setShowCreateRecurringDialog={setShowCreateRecurringDialog}
          newRecurringUrl={newRecurringUrl}
          setNewRecurringUrl={setNewRecurringUrl}
          newRecurringFrequency={newRecurringFrequency}
          setNewRecurringFrequency={setNewRecurringFrequency}
          isCreatingRecurring={isCreatingRecurring}
          onCreateRecurringScan={handleCreateRecurringScan}
          onToggleRecurringScan={handleToggleRecurringScan}
          onDeleteRecurringScan={handleDeleteRecurringScan}
          onOpenPreferences={handleOpenPreferences}
          getFrequencyLabel={getFrequencyLabel}
          formatRelativeTime={formatRelativeTime}
          onSubscribeClick={() => {
            // Navigate to subscription page or open checkout
            window.location.href = '/pricing';
          }}
        />

        {/* Scans List */}
        <ScanList
          loading={loading}
          scans={scans}
          allTags={allTags}
          selectedTags={selectedTags}
          showTagFilter={showTagFilter}
          setShowTagFilter={setShowTagFilter}
          comparisonMode={comparisonMode}
          selectedScanForComparison={selectedScanForComparison}
          onToggleTagFilter={handleToggleTagFilter}
          onClearTagFilter={handleClearTagFilter}
          onCancelComparison={cancelComparison}
          getScansForUrl={getScansForUrl}
          onQuickCompare={handleQuickCompare}
          onCompareScans={handleCompareScans}
          onUnlock={handleUnlock}
          onAddTag={handleAddTag}
          onRemoveTag={handleRemoveTag}
          downloadFile={downloadFile}
          botAccessTests={botAccessTests}
          testingBots={testingBots}
          onTestBotAccess={testBotAccess}
          expandedScan={expandedScan}
          setExpandedScan={setExpandedScan}
        />
      </div>

      {/* Payment Modal */}
      {selectedScan && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          scanId={selectedScan.id}
          url={selectedScan.url}
          onSuccess={handlePaymentSuccess}
        />
      )}


      {/* Notification Preferences Dialog */}
      <Dialog open={showPreferencesDialog} onOpenChange={setShowPreferencesDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              Notification Settings
            </DialogTitle>
            <DialogDescription>
              {selectedRecurringScan && (
                <span className="font-mono text-xs">{selectedRecurringScan.url}</span>
              )}
            </DialogDescription>
          </DialogHeader>
          {preferences && (
            <div className="space-y-4 py-4">
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Notify me when:</Label>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="robots-change" className="text-sm font-normal">
                      robots.txt changes
                    </Label>
                    <Switch
                      id="robots-change"
                      checked={preferences.notifyOnRobotsTxtChange}
                      onCheckedChange={(checked) => 
                        setPreferences({...preferences, notifyOnRobotsTxtChange: checked})
                      }
                      data-testid="switch-robots"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="llms-change" className="text-sm font-normal">
                      llms.txt changes
                    </Label>
                    <Switch
                      id="llms-change"
                      checked={preferences.notifyOnLlmsTxtChange}
                      onCheckedChange={(checked) => 
                        setPreferences({...preferences, notifyOnLlmsTxtChange: checked})
                      }
                      data-testid="switch-llms"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="bot-permission-change" className="text-sm font-normal">
                      Bot permissions change
                    </Label>
                    <Switch
                      id="bot-permission-change"
                      checked={preferences.notifyOnBotPermissionChange}
                      onCheckedChange={(checked) => 
                        setPreferences({...preferences, notifyOnBotPermissionChange: checked})
                      }
                      data-testid="switch-bot-permissions"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="errors" className="text-sm font-normal">
                      New errors detected
                    </Label>
                    <Switch
                      id="errors"
                      checked={preferences.notifyOnNewErrors}
                      onCheckedChange={(checked) => 
                        setPreferences({...preferences, notifyOnNewErrors: checked})
                      }
                      data-testid="switch-errors"
                    />
                  </div>
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="method">Notification Method</Label>
                <Select 
                  value={preferences.notificationMethod} 
                  onValueChange={(value: any) => setPreferences({...preferences, notificationMethod: value})}
                >
                  <SelectTrigger id="method" data-testid="select-notification-method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in-app">In-app only</SelectItem>
                    <SelectItem value="email">Email only</SelectItem>
                    <SelectItem value="both">Both in-app and email</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowPreferencesDialog(false);
                setSelectedRecurringScan(null);
                setPreferences(null);
              }}
              data-testid="button-cancel-preferences"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSavePreferences}
              disabled={isSavingPreferences}
              className="bg-primary text-primary-foreground hover:bg-primary/90 btn-hover-lift"
              data-testid="button-save-preferences"
            >
              {isSavingPreferences ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notifications Sheet */}
      <NotificationSheet
        showNotificationsSheet={showNotificationsSheet}
        setShowNotificationsSheet={setShowNotificationsSheet}
        notifications={notifications}
        unreadCount={unreadCount}
        onMarkAllRead={handleMarkAllRead}
        onMarkNotificationRead={handleMarkNotificationRead}
        formatRelativeTime={formatRelativeTime}
        loadingScanId={loadingScanId}
        setLoadingScanId={setLoadingScanId}
        setScanDetailsData={setScanDetailsData}
        setShowScanDetailsModal={setShowScanDetailsModal}
      />

      {/* Scan Comparison Dialog */}
      <Dialog open={showComparison} onOpenChange={setShowComparison}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto [&>button]:hidden">
          {comparisonOldScan && comparisonNewScan && (
            <ScanComparison
              scanA={comparisonOldScan}
              scanB={comparisonNewScan}
              labels={comparisonLabels}
              onClose={() => {
                setShowComparison(false);
                setComparisonOldScan(null);
                setComparisonNewScan(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Competitor Comparison Dialog */}
      <Dialog open={showCompetitorDialog} onOpenChange={setShowCompetitorDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitCompare className="w-5 h-5 text-primary" />
              Compare Sites
            </DialogTitle>
            <DialogDescription>
              Compare your website against a competitor to analyze differences in bot access configuration
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="my-url">Your Website URL</Label>
              <Input
                id="my-url"
                type="url"
                placeholder="example.com"
                value={myUrlForCompare}
                onChange={(e) => setMyUrlForCompare(e.target.value)}
                data-testid="input-my-url"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="competitor-url">Competitor Website URL</Label>
              <Input
                id="competitor-url"
                type="url"
                placeholder="competitor.com"
                value={competitorUrl}
                onChange={(e) => setCompetitorUrl(e.target.value)}
                data-testid="input-competitor-url"
              />
            </div>
            {competitorError && (
              <div className="text-sm text-red-400 flex items-center gap-2" data-testid="text-competitor-error">
                <AlertCircle className="w-4 h-4" />
                {competitorError}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCompetitorDialog(false);
                setCompetitorUrl("");
                setMyUrlForCompare("");
              }}
              data-testid="button-cancel-competitor"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCompetitorAnalysis}
              disabled={isAnalyzingCompetitor || !competitorUrl.trim() || !myUrlForCompare.trim()}
              className="bg-primary text-primary-foreground hover:bg-primary/90 btn-hover-lift"
              data-testid="button-analyze-competitor"
            >
              {isAnalyzingCompetitor ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                  Analyzing...
                </>
              ) : (
                <>
                  <GitCompare className="w-4 h-4 mr-2" />
                  Compare
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Trophy Case Modal */}
      <TrophyCase 
        open={showTrophyCase} 
        onOpenChange={setShowTrophyCase} 
      />

      {/* Scan Details Modal */}
      <ScanDetailsModal
        open={showScanDetailsModal}
        onClose={() => {
          setShowScanDetailsModal(false);
          setScanDetailsData(null);
        }}
        scan={scanDetailsData}
        onUnlockClick={(scan) => {
          setSelectedScan(scan);
          setShowPaymentModal(true);
          setShowScanDetailsModal(false);
        }}
        onSubscribeClick={() => {
          setShowScanDetailsModal(false);
          window.location.href = '/pricing';
        }}
        isAdmin={user?.isAdmin}
      />
    </div>
  );
}
