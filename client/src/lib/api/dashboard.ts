import type { ScanWithPurchase } from "@/components/dashboard/ScanList";
import type { Notification } from "@/components/dashboard/NotificationSheet";
import type { RecurringScan } from "@/components/dashboard/RecurringScans";
import type { NotificationPreferences } from "@/components/dashboard/SettingsPanel";

export async function fetchUserScans(
  tagFilter?: string[]
): Promise<ScanWithPurchase[]> {
  const params = new URLSearchParams();
  if (tagFilter?.length) {
    tagFilter.forEach((tag) => params.append("tags", tag));
  }
  const queryString = params.toString();
  const url = queryString
    ? `/api/user/scans?${queryString}`
    : "/api/user/scans";

  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) {
    throw new Error("Failed to fetch scans");
  }
  const data = await response.json();
  return Array.isArray(data) ? data : (data.scans || []);
}

export async function fetchUserTags(): Promise<string[]> {
  const response = await fetch("/api/user/tags", { credentials: "include" });
  if (!response.ok) {
    throw new Error("Failed to fetch tags");
  }
  return response.json();
}

export async function patchScanTags(
  scanId: number,
  tags: string[]
): Promise<void> {
  const response = await fetch(`/api/scans/${scanId}/tags`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tags }),
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error("Failed to update tags");
  }
}

export async function fetchNotifications(): Promise<Notification[]> {
  const response = await fetch("/api/notifications", {
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error("Failed to fetch notifications");
  }
  return response.json();
}

export async function fetchUnreadNotificationCount(): Promise<number> {
  const response = await fetch("/api/notifications/unread-count", {
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error("Failed to fetch unread count");
  }
  const data = (await response.json()) as { count: number };
  return data.count;
}

export async function markNotificationRead(id: number): Promise<void> {
  const response = await fetch(`/api/notifications/${id}/read`, {
    method: "PATCH",
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error("Failed to mark notification read");
  }
}

export async function markAllNotificationsRead(): Promise<void> {
  const response = await fetch("/api/notifications/mark-all-read", {
    method: "POST",
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error("Failed to mark all notifications read");
  }
}

export async function fetchRecurringScans(): Promise<RecurringScan[]> {
  const response = await fetch("/api/recurring-scans", {
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error("Failed to fetch recurring scans");
  }
  return response.json();
}

export interface CreateRecurringScanInput {
  url: string;
  frequency: "daily" | "weekly" | "monthly";
}

export async function createRecurringScan(
  input: CreateRecurringScanInput
): Promise<Response> {
  return fetch("/api/recurring-scans", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    credentials: "include",
  });
}

export async function patchRecurringScanActive(
  id: number,
  isActive: boolean
): Promise<void> {
  const response = await fetch(`/api/recurring-scans/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive }),
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error("Failed to update recurring scan");
  }
}

export async function deleteRecurringScan(id: number): Promise<void> {
  const response = await fetch(`/api/recurring-scans/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error("Failed to delete recurring scan");
  }
}

export async function fetchRecurringPreferences(
  recurringScanId: number
): Promise<NotificationPreferences> {
  const response = await fetch(
    `/api/recurring-scans/${recurringScanId}/preferences`,
    { credentials: "include" }
  );
  if (!response.ok) {
    throw new Error("Failed to load notification preferences");
  }
  return response.json();
}

export async function patchRecurringPreferences(
  recurringScanId: number,
  preferences: Pick<
    NotificationPreferences,
    | "notifyOnRobotsTxtChange"
    | "notifyOnLlmsTxtChange"
    | "notifyOnBotPermissionChange"
    | "notifyOnNewErrors"
    | "notificationMethod"
  >
): Promise<void> {
  const response = await fetch(
    `/api/recurring-scans/${recurringScanId}/preferences`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(preferences),
      credentials: "include",
    }
  );
  if (!response.ok) {
    throw new Error("Failed to save notification preferences");
  }
}

export async function fetchScanById(scanId: number): Promise<ScanWithPurchase> {
  const response = await fetch(`/api/scans/${scanId}`, {
    credentials: "include",
  });
  if (!response.ok) {
    const err = new Error("Failed to load scan") as Error & { status?: number };
    err.status = response.status;
    throw err;
  }
  return response.json();
}
