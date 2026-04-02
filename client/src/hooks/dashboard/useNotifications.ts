import { useCallback, useEffect, useState } from "react";
import type { Notification } from "@/components/dashboard/NotificationSheet";

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotificationsSheet, setShowNotificationsSheet] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications", {
        credentials: "include",
      });
      if (response.ok) {
        const data = (await response.json()) as Notification[];
        setNotifications(data);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications/unread-count", {
        credentials: "include",
      });
      if (response.ok) {
        const data = (await response.json()) as { count: number };
        setUnreadCount(data.count);
      }
    } catch (error) {
      console.error("Failed to fetch unread count:", error);
    }
  }, []);

  useEffect(() => {
    void fetchNotifications();
    void fetchUnreadCount();

    const interval = setInterval(() => {
      void fetchNotifications();
      void fetchUnreadCount();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchNotifications, fetchUnreadCount]);

  const handleMarkNotificationRead = async (id: number) => {
    try {
      const response = await fetch(`/api/notifications/${id}/read`, {
        method: "PATCH",
        credentials: "include",
      });

      if (response.ok) {
        await fetchNotifications();
        await fetchUnreadCount();
      }
    } catch (error) {
      console.error("Mark notification read error:", error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const response = await fetch("/api/notifications/mark-all-read", {
        method: "POST",
        credentials: "include",
      });

      if (response.ok) {
        await fetchNotifications();
        await fetchUnreadCount();
      }
    } catch (error) {
      console.error("Mark all read error:", error);
    }
  };

  return {
    notifications,
    unreadCount,
    showNotificationsSheet,
    setShowNotificationsSheet,
    fetchNotifications,
    fetchUnreadCount,
    handleMarkNotificationRead,
    handleMarkAllRead,
  };
}
