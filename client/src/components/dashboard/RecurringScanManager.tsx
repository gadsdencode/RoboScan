import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  RecurringScans,
  type RecurringScan,
} from "@/components/dashboard/RecurringScans";
import { formatRelativeTime } from "@/lib/formatRelativeTime";

export interface RecurringScanManagerProps {
  onOpenPreferences: (scan: RecurringScan) => void | Promise<void>;
  onRecurringScansChange?: (scans: RecurringScan[]) => void;
}

function getFrequencyLabel(frequency: string): string {
  switch (frequency) {
    case "daily":
      return "Every day";
    case "weekly":
      return "Every week";
    case "monthly":
      return "Every month";
    default:
      return frequency;
  }
}

export function RecurringScanManager({
  onOpenPreferences,
  onRecurringScansChange,
}: RecurringScanManagerProps) {
  const [recurringScans, setRecurringScans] = useState<RecurringScan[]>([]);
  const [showCreateRecurringDialog, setShowCreateRecurringDialog] =
    useState(false);
  const [newRecurringUrl, setNewRecurringUrl] = useState("");
  const [newRecurringFrequency, setNewRecurringFrequency] = useState<
    "daily" | "weekly" | "monthly"
  >("daily");
  const [isCreatingRecurring, setIsCreatingRecurring] = useState(false);

  const fetchRecurringScans = useCallback(async () => {
    try {
      const response = await fetch("/api/recurring-scans", {
        credentials: "include",
      });
      if (response.ok) {
        const data = (await response.json()) as RecurringScan[];
        setRecurringScans(data);
      }
    } catch (error) {
      console.error("Failed to fetch recurring scans:", error);
    }
  }, []);

  useEffect(() => {
    void fetchRecurringScans();
  }, [fetchRecurringScans]);

  useEffect(() => {
    onRecurringScansChange?.(recurringScans);
  }, [recurringScans, onRecurringScansChange]);

  const handleCreateRecurringScan = async () => {
    if (!newRecurringUrl.trim()) return;

    setIsCreatingRecurring(true);

    try {
      const response = await fetch("/api/recurring-scans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: newRecurringUrl,
          frequency: newRecurringFrequency,
        }),
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as {
          message?: string;
          requiresSubscription?: boolean;
        };

        if (response.status === 403 && errorData.requiresSubscription) {
          toast.error("Subscription Required", {
            description:
              "Recurring scans are a Guardian feature. Upgrade to enable automatic monitoring.",
            action: {
              label: "Upgrade",
              onClick: () => {
                window.location.href = "/pricing";
              },
            },
          });
          setShowCreateRecurringDialog(false);
          return;
        }

        throw new Error(errorData.message || "Failed to create recurring scan");
      }

      await fetchRecurringScans();
      setShowCreateRecurringDialog(false);
      const createdUrl = newRecurringUrl;
      const createdFreq = newRecurringFrequency;
      setNewRecurringUrl("");
      setNewRecurringFrequency("daily");

      toast.success("Recurring Scan Created", {
        description: `Monitoring ${createdUrl} ${createdFreq}`,
      });
    } catch (error) {
      console.error("Create recurring scan error:", error);
      toast.error("Failed to create recurring scan", {
        description:
          error instanceof Error ? error.message : "Please try again",
      });
    } finally {
      setIsCreatingRecurring(false);
    }
  };

  const handleToggleRecurringScan = async (
    id: number,
    currentlyActive: boolean
  ) => {
    try {
      const response = await fetch(`/api/recurring-scans/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isActive: !currentlyActive }),
        credentials: "include",
      });

      if (response.ok) {
        await fetchRecurringScans();
      }
    } catch (error) {
      console.error("Toggle recurring scan error:", error);
    }
  };

  const handleDeleteRecurringScan = async (id: number) => {
    if (!confirm("Are you sure you want to delete this recurring scan?")) {
      return;
    }

    try {
      const response = await fetch(`/api/recurring-scans/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        await fetchRecurringScans();
      }
    } catch (error) {
      console.error("Delete recurring scan error:", error);
    }
  };

  return (
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
      onOpenPreferences={async (scan) => {
        await Promise.resolve(onOpenPreferences(scan));
      }}
      getFrequencyLabel={getFrequencyLabel}
      formatRelativeTime={formatRelativeTime}
      onSubscribeClick={() => {
        window.location.href = "/pricing";
      }}
    />
  );
}
