import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  fetchNotifications,
  fetchUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/api/dashboard";
import { queryKeys } from "@/lib/queryKeys";

const NOTIFICATION_POLL_MS = 30_000;

export function useNotifications() {
  const queryClient = useQueryClient();
  const [showNotificationsSheet, setShowNotificationsSheet] = useState(false);

  const notificationsQuery = useQuery({
    queryKey: queryKeys.notifications.list,
    queryFn: fetchNotifications,
    refetchInterval: NOTIFICATION_POLL_MS,
  });

  const unreadQuery = useQuery({
    queryKey: queryKeys.notifications.unreadCount,
    queryFn: fetchUnreadNotificationCount,
    refetchInterval: NOTIFICATION_POLL_MS,
  });

  const invalidateNotifications = () => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.notifications.list,
    });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.notifications.unreadCount,
    });
  };

  const markOneMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: invalidateNotifications,
  });

  const markAllMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: invalidateNotifications,
  });

  const handleMarkNotificationRead = async (id: number) => {
    await markOneMutation.mutateAsync(id);
  };

  const handleMarkAllRead = async () => {
    await markAllMutation.mutateAsync();
  };

  return {
    notifications: notificationsQuery.data ?? [],
    unreadCount: unreadQuery.data ?? 0,
    showNotificationsSheet,
    setShowNotificationsSheet,
    fetchNotifications: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.list }),
    fetchUnreadCount: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.unreadCount,
      }),
    handleMarkNotificationRead,
    handleMarkAllRead,
  };
}
