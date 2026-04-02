import { motion, AnimatePresence } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { Bell, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { fetchScanById } from "@/lib/api/dashboard";

export interface Notification {
  id: number;
  userId: string;
  recurringScanId: number | null;
  scanId: number | null;
  type: string;
  title: string;
  message: string;
  changes: Record<string, any> | null;
  isRead: boolean;
  createdAt: string;
}

interface NotificationSheetProps {
  showNotificationsSheet: boolean;
  setShowNotificationsSheet: (show: boolean) => void;
  notifications: Notification[];
  unreadCount: number;
  onMarkAllRead: () => Promise<void>;
  onMarkNotificationRead: (id: number) => Promise<void>;
  formatRelativeTime: (date: string) => string;
  loadingScanId: number | null;
  setLoadingScanId: (id: number | null) => void;
  setScanDetailsData: (scan: any) => void;
  setShowScanDetailsModal: (show: boolean) => void;
}

export function NotificationSheet({
  showNotificationsSheet,
  setShowNotificationsSheet,
  notifications,
  unreadCount,
  onMarkAllRead,
  onMarkNotificationRead,
  formatRelativeTime,
  loadingScanId,
  setLoadingScanId,
  setScanDetailsData,
  setShowScanDetailsModal,
}: NotificationSheetProps) {
  const loadScanMutation = useMutation({
    mutationFn: async ({
      scanId,
      notificationId,
    }: {
      scanId: number;
      notificationId: number;
    }) => {
      const scan = await fetchScanById(scanId);
      return { scan, notificationId };
    },
    onMutate: ({ scanId }) => {
      setLoadingScanId(scanId);
    },
    onSettled: () => {
      setLoadingScanId(null);
    },
    onSuccess: ({ scan, notificationId }) => {
      setScanDetailsData(scan);
      setShowScanDetailsModal(true);
      setShowNotificationsSheet(false);
      onMarkNotificationRead(notificationId);
    },
    onError: (error) => {
      const status = (error as Error & { status?: number }).status;
      if (status === 404) {
        toast.error("Scan not found. It may have been deleted.");
      } else {
        toast.error("Failed to load scan details");
      }
    },
  });

  return (
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
                onClick={onMarkAllRead}
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
                {notifications.map((notification) => {
                  const notificationIcon = notification.type === 'xp_gain' ? '🎮' :
                    notification.type === 'robots_txt_change' ? '🤖' :
                      notification.type === 'llms_txt_change' ? '✨' :
                        notification.type === 'bot_permission_change' ? '⚠️' :
                          notification.type === 'new_errors' ? '❌' : '🔔';

                  return (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className={`p-4 rounded-lg border transition-all ${
                        notification.isRead
                          ? 'bg-card border border-border'
                          : 'bg-primary/10 border-primary/30'
                      }`}
                      data-testid={`notification-${notification.id}`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className="text-2xl flex-shrink-0" aria-label="notification-icon">
                          {notificationIcon}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-sm text-foreground">
                              {notification.title}
                            </h4>
                            {!notification.isRead && (
                              <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                            )}
                          </div>

                          <p className="text-sm text-foreground/80 break-words mb-2">
                            {notification.message}
                          </p>

                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs text-muted-foreground">
                              {formatRelativeTime(notification.createdAt)}
                            </p>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2">
                              {notification.scanId && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    loadScanMutation.mutate({
                                      scanId: notification.scanId!,
                                      notificationId: notification.id,
                                    })
                                  }
                                  disabled={
                                    loadScanMutation.isPending &&
                                    loadScanMutation.variables?.scanId ===
                                      notification.scanId
                                  }
                                  className="h-7 text-xs"
                                  data-testid={`button-view-scan-${notification.id}`}
                                >
                                  <ArrowRight className="w-3 h-3 mr-1" />
                                  {loadScanMutation.isPending &&
                                  loadScanMutation.variables?.scanId ===
                                    notification.scanId
                                    ? "Loading..."
                                    : "View Scan"}
                                </Button>
                              )}

                              {!notification.isRead && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onMarkNotificationRead(notification.id)}
                                  className="h-7 text-xs"
                                  data-testid={`button-mark-read-${notification.id}`}
                                >
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Mark Read
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
