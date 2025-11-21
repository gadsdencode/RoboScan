import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, LogOut, FileText, Lock, Download, CheckCircle2, AlertCircle, Calendar, Globe, Sparkles, Search, ArrowRight, Bot, Bell, Clock, Repeat, Settings, Trash2, Play, Pause, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { PaymentModal } from "@/components/PaymentModal";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
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

interface ScanWithPurchase extends Scan {
  isPurchased: boolean;
}

interface RecurringScan {
  id: number;
  url: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  isActive: boolean;
  lastRunAt: string | null;
  nextRunAt: string;
  createdAt: string;
}

interface Notification {
  id: number;
  recurringScanId: number;
  changeType: string;
  changeDetails: string;
  isRead: boolean;
  createdAt: string;
}

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
  const [scans, setScans] = useState<ScanWithPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedScan, setSelectedScan] = useState<ScanWithPurchase | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [expandedScan, setExpandedScan] = useState<number | null>(null);
  const [scanUrl, setScanUrl] = useState("");
  const [isScanning, setIsScanning] = useState(false);
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

  useEffect(() => {
    fetchScans();
    fetchRecurringScans();
    fetchNotifications();
    fetchUnreadCount();

    // Poll for notifications every 30 seconds
    const interval = setInterval(() => {
      fetchNotifications();
      fetchUnreadCount();
    }, 30000);

    return () => clearInterval(interval);
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

  const fetchRecurringScans = async () => {
    try {
      const response = await fetch('/api/recurring-scans');
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
      const response = await fetch('/api/notifications');
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
      const response = await fetch('/api/notifications/unread-count');
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
      
      await fetchScans();
      setScanUrl("");
    } catch (error) {
      console.error('Scan error:', error);
      setScanError(error instanceof Error ? error.message : 'Failed to scan website');
    } finally {
      setIsScanning(false);
    }
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
      });

      if (!response.ok) {
        throw new Error('Failed to create recurring scan');
      }

      await fetchRecurringScans();
      setShowCreateRecurringDialog(false);
      setNewRecurringUrl("");
      setNewRecurringFrequency('daily');
    } catch (error) {
      console.error('Create recurring scan error:', error);
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
      const response = await fetch(`/api/recurring-scans/${scan.id}/preferences`);
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
            {/* Notifications Bell */}
            <button
              onClick={() => setShowNotificationsSheet(true)}
              className="relative p-2 hover:bg-white/5 rounded-lg transition-colors"
              data-testid="button-notifications"
            >
              <Bell className="w-5 h-5 text-muted-foreground" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

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

        {/* Recurring Scans Section */}
        <Card className="p-6 bg-card border-white/5 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Repeat className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold">Recurring Scans</h2>
            </div>
            <Button
              onClick={() => setShowCreateRecurringDialog(true)}
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              data-testid="button-create-recurring"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Recurring Scan
            </Button>
          </div>

          {recurringScans.length === 0 ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/20 rounded-full mb-3">
                <Repeat className="w-6 h-6 text-primary" />
              </div>
              <p className="text-muted-foreground text-sm">
                No recurring scans yet. Set up automatic monitoring to get notified of changes.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recurringScans.map((scan) => (
                <div
                  key={scan.id}
                  className="p-4 bg-background/50 border border-white/5 rounded-lg hover:border-primary/20 transition-all"
                  data-testid={`recurring-scan-${scan.id}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Globe className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="font-mono font-semibold">{scan.url}</span>
                        <Badge 
                          variant={scan.isActive ? "default" : "secondary"}
                          className={scan.isActive ? "bg-green-500/20 text-green-400 border-green-500/30" : ""}
                        >
                          {scan.isActive ? 'Active' : 'Paused'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {getFrequencyLabel(scan.frequency)}
                        </span>
                        {scan.lastRunAt && (
                          <span>Last scan: {formatRelativeTime(scan.lastRunAt)}</span>
                        )}
                        <span>Next: {new Date(scan.nextRunAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleRecurringScan(scan.id, scan.isActive)}
                        data-testid={`button-toggle-${scan.id}`}
                      >
                        {scan.isActive ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenPreferences(scan)}
                        data-testid={`button-preferences-${scan.id}`}
                      >
                        <Settings className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteRecurringScan(scan.id)}
                        className="text-red-400 hover:text-red-300"
                        data-testid={`button-delete-${scan.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Scans List */}
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

                    {/* Bot Permissions Preview */}
                    {scan.botPermissions && Object.keys(scan.botPermissions).length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                          <Bot className="w-4 h-4 text-primary" />
                          AI Bot Permissions
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {Object.entries(scan.botPermissions as Record<string, string>).slice(0, 6).map(([bot, permission]) => (
                            <div 
                              key={bot} 
                              className="flex items-center gap-2 p-2 bg-background/50 border border-white/5 rounded text-xs"
                            >
                              <div className={`w-2 h-2 rounded-full ${
                                permission.toLowerCase().includes('allow') || permission.toLowerCase().includes('yes')
                                  ? 'bg-green-400' 
                                  : permission.toLowerCase().includes('disallow') || permission.toLowerCase().includes('no')
                                  ? 'bg-red-400'
                                  : 'bg-yellow-400'
                              }`} />
                              <span className="font-mono truncate">{bot}</span>
                            </div>
                          ))}
                          {Object.keys(scan.botPermissions as Record<string, string>).length > 6 && (
                            <div className="flex items-center gap-2 p-2 bg-primary/10 border border-primary/20 rounded text-xs text-primary font-semibold">
                              +{Object.keys(scan.botPermissions as Record<string, string>).length - 6} more
                            </div>
                          )}
                        </div>
                      </div>
                    )}

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
                      <div className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/30 rounded-lg">
                        <div className="flex items-start gap-4">
                          <div className="p-3 bg-primary/20 rounded-lg">
                            <Lock className="w-6 h-6 text-primary" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold text-lg mb-2 flex items-center gap-2">
                              <Sparkles className="w-5 h-5 text-primary" />
                              Premium Optimization Report
                            </h4>
                            <p className="text-sm text-muted-foreground mb-4">
                              Unlock comprehensive insights and downloadable files:
                            </p>
                            <div className="grid gap-2 mb-4">
                              <div className="flex items-center gap-2 text-sm">
                                <CheckCircle2 className="w-4 h-4 text-green-400" />
                                <span>Full <span className="font-semibold font-mono">robots.txt</span> content with validation</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <CheckCircle2 className="w-4 h-4 text-green-400" />
                                <span>Complete <span className="font-semibold font-mono">llms.txt</span> file analysis</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <CheckCircle2 className="w-4 h-4 text-green-400" />
                                <span>Detailed bot permissions breakdown</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <CheckCircle2 className="w-4 h-4 text-green-400" />
                                <span>Downloadable optimization recommendations</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <CheckCircle2 className="w-4 h-4 text-green-400" />
                                <span>Ready-to-use configuration files</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Button
                                onClick={() => handleUnlock(scan)}
                                className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold"
                                data-testid={`button-unlock-${scan.id}`}
                              >
                                <Sparkles className="w-4 h-4 mr-2" />
                                Unlock for $9.99
                              </Button>
                              <span className="text-xs text-muted-foreground">One-time payment • Instant access</span>
                            </div>
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

      {/* Create Recurring Scan Dialog */}
      <Dialog open={showCreateRecurringDialog} onOpenChange={setShowCreateRecurringDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Repeat className="w-5 h-5 text-primary" />
              Create Recurring Scan
            </DialogTitle>
            <DialogDescription>
              Set up automatic monitoring to get notified when your website's bot configuration changes
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="url">Website URL</Label>
              <Input
                id="url"
                type="url"
                placeholder="example.com"
                value={newRecurringUrl}
                onChange={(e) => setNewRecurringUrl(e.target.value)}
                data-testid="input-recurring-url"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="frequency">Scan Frequency</Label>
              <Select value={newRecurringFrequency} onValueChange={(value: any) => setNewRecurringFrequency(value)}>
                <SelectTrigger id="frequency" data-testid="select-frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateRecurringDialog(false)}
              data-testid="button-cancel-recurring"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateRecurringScan}
              disabled={isCreatingRecurring || !newRecurringUrl.trim()}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              data-testid="button-confirm-recurring"
            >
              {isCreatingRecurring ? 'Creating...' : 'Create Scan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              data-testid="button-save-preferences"
            >
              {isSavingPreferences ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notifications Sheet */}
      <Sheet open={showNotificationsSheet} onOpenChange={setShowNotificationsSheet}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Notifications
            </SheetTitle>
            <SheetDescription>
              Changes detected in your monitored websites
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            {notifications.length > 0 && unreadCount > 0 && (
              <div className="mb-4 flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllRead}
                  data-testid="button-mark-all-read"
                >
                  Mark all as read
                </Button>
              </div>
            )}
            {notifications.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/20 rounded-full mb-3">
                  <Bell className="w-6 h-6 text-primary" />
                </div>
                <p className="text-muted-foreground text-sm">
                  No notifications yet
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {notifications.map((notification) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className={`p-4 rounded-lg border transition-all ${
                        notification.isRead 
                          ? 'bg-background/30 border-white/5' 
                          : 'bg-primary/10 border-primary/30'
                      }`}
                      data-testid={`notification-${notification.id}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              {notification.changeType}
                            </Badge>
                            {!notification.isRead && (
                              <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-sm text-foreground/90 break-words">
                            {notification.changeDetails}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {formatRelativeTime(notification.createdAt)}
                          </p>
                        </div>
                        {!notification.isRead && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMarkNotificationRead(notification.id)}
                            className="flex-shrink-0"
                            data-testid={`button-mark-read-${notification.id}`}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
