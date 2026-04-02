import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  RecurringScans,
  type RecurringScan,
} from "@/components/dashboard/RecurringScans";
import { formatRelativeTime } from "@/lib/formatRelativeTime";
import {
  createRecurringScan,
  deleteRecurringScan,
  fetchRecurringScans,
  patchRecurringScanActive,
} from "@/lib/api/dashboard";
import { queryKeys } from "@/lib/queryKeys";

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
  const queryClient = useQueryClient();
  const [showCreateRecurringDialog, setShowCreateRecurringDialog] =
    useState(false);
  const [newRecurringUrl, setNewRecurringUrl] = useState("");
  const [newRecurringFrequency, setNewRecurringFrequency] = useState<
    "daily" | "weekly" | "monthly"
  >("daily");

  const recurringQuery = useQuery({
    queryKey: queryKeys.recurringScans.list,
    queryFn: fetchRecurringScans,
  });

  const recurringScans = recurringQuery.data ?? [];

  useEffect(() => {
    onRecurringScansChange?.(recurringScans);
  }, [recurringScans, onRecurringScansChange]);

  const createMutation = useMutation({
    mutationFn: async (input: {
      url: string;
      frequency: "daily" | "weekly" | "monthly";
    }) => {
      const response = await createRecurringScan(input);
      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as {
          message?: string;
          requiresSubscription?: boolean;
        };
        const err = new Error(
          errorData.message || "Failed to create recurring scan"
        ) as Error & { status?: number; requiresSubscription?: boolean };
        err.status = response.status;
        err.requiresSubscription = errorData.requiresSubscription;
        throw err;
      }
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.recurringScans.list,
      });
      setShowCreateRecurringDialog(false);
      setNewRecurringUrl("");
      setNewRecurringFrequency("daily");
      toast.success("Recurring Scan Created", {
        description: `Monitoring ${variables.url} ${variables.frequency}`,
      });
    },
    onError: (error: Error & { status?: number; requiresSubscription?: boolean }) => {
      if (error.status === 403 && error.requiresSubscription) {
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
      toast.error("Failed to create recurring scan", {
        description: error.message || "Please try again",
      });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({
      id,
      currentlyActive,
    }: {
      id: number;
      currentlyActive: boolean;
    }) => patchRecurringScanActive(id, !currentlyActive),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.recurringScans.list,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteRecurringScan(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.recurringScans.list,
      });
    },
  });

  const handleCreateRecurringScan = async () => {
    if (!newRecurringUrl.trim()) return;
    await createMutation.mutateAsync({
      url: newRecurringUrl,
      frequency: newRecurringFrequency,
    });
  };

  const handleToggleRecurringScan = async (
    id: number,
    currentlyActive: boolean
  ) => {
    await toggleMutation.mutateAsync({ id, currentlyActive });
  };

  const handleDeleteRecurringScan = async (id: number) => {
    if (!confirm("Are you sure you want to delete this recurring scan?")) {
      return;
    }
    await deleteMutation.mutateAsync(id);
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
      isCreatingRecurring={createMutation.isPending}
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
