import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import type { RecurringScan } from "@/components/dashboard/RecurringScans";
import {
  fetchRecurringPreferences,
  patchRecurringPreferences,
} from "@/lib/api/dashboard";
import { queryKeys } from "@/lib/queryKeys";

export interface NotificationPreferences {
  id: number;
  recurringScanId: number;
  notifyOnRobotsTxtChange: boolean;
  notifyOnLlmsTxtChange: boolean;
  notifyOnBotPermissionChange: boolean;
  notifyOnNewErrors: boolean;
  notificationMethod: "in-app" | "email" | "both";
}

export interface SettingsPanelHandle {
  openPreferences: (scan: RecurringScan) => Promise<void>;
}

type NotificationMethod = NotificationPreferences["notificationMethod"];

export const SettingsPanel = forwardRef<SettingsPanelHandle, object>(
  function SettingsPanel(_props, ref) {
    const queryClient = useQueryClient();
    const [showPreferencesDialog, setShowPreferencesDialog] = useState(false);
    const [selectedRecurringScan, setSelectedRecurringScan] =
      useState<RecurringScan | null>(null);
    const [preferences, setPreferences] =
      useState<NotificationPreferences | null>(null);

    const preferencesQuery = useQuery({
      queryKey: queryKeys.recurringPreferences(selectedRecurringScan?.id ?? 0),
      queryFn: () => fetchRecurringPreferences(selectedRecurringScan!.id),
      enabled: Boolean(selectedRecurringScan && showPreferencesDialog),
    });

    useEffect(() => {
      setPreferences(null);
    }, [selectedRecurringScan?.id]);

    useEffect(() => {
      if (preferencesQuery.data) {
        setPreferences(preferencesQuery.data);
      }
    }, [preferencesQuery.data]);

    const resetDialog = useCallback(() => {
      setShowPreferencesDialog(false);
      setSelectedRecurringScan(null);
      setPreferences(null);
    }, []);

    const openPreferences = useCallback(async (scan: RecurringScan) => {
      setSelectedRecurringScan(scan);
      setShowPreferencesDialog(true);
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        openPreferences,
      }),
      [openPreferences]
    );

    const saveMutation = useMutation({
      mutationFn: async () => {
        if (!selectedRecurringScan || !preferences) {
          throw new Error("Missing preferences");
        }
        await patchRecurringPreferences(selectedRecurringScan.id, {
          notifyOnRobotsTxtChange: preferences.notifyOnRobotsTxtChange,
          notifyOnLlmsTxtChange: preferences.notifyOnLlmsTxtChange,
          notifyOnBotPermissionChange:
            preferences.notifyOnBotPermissionChange,
          notifyOnNewErrors: preferences.notifyOnNewErrors,
          notificationMethod: preferences.notificationMethod,
        });
      },
      onSuccess: () => {
        if (selectedRecurringScan) {
          void queryClient.invalidateQueries({
            queryKey: queryKeys.recurringPreferences(selectedRecurringScan.id),
          });
        }
        resetDialog();
      },
      onError: (error) => {
        console.error("Save preferences error:", error);
      },
    });

    const handleSavePreferences = () => {
      void saveMutation.mutateAsync();
    };

    const prefsLoading =
      preferencesQuery.isPending && !preferencesQuery.data;

    return (
      <Dialog
        open={showPreferencesDialog}
        onOpenChange={(open) => {
          if (!open) resetDialog();
          else setShowPreferencesDialog(open);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              Notification Settings
            </DialogTitle>
            <DialogDescription>
              {selectedRecurringScan && (
                <span className="font-mono text-xs">
                  {selectedRecurringScan.url}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          {preferencesQuery.isError && (
            <p className="text-sm text-destructive py-2">
              Failed to load notification settings. Please try again.
            </p>
          )}
          {prefsLoading && (
            <p className="text-sm text-muted-foreground py-4">Loading…</p>
          )}
          {preferences && (
            <div className="space-y-4 py-4">
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Notify me when:</Label>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="robots-change"
                      className="text-sm font-normal"
                    >
                      robots.txt changes
                    </Label>
                    <Switch
                      id="robots-change"
                      checked={preferences.notifyOnRobotsTxtChange}
                      onCheckedChange={(checked) =>
                        setPreferences({
                          ...preferences,
                          notifyOnRobotsTxtChange: checked,
                        })
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
                        setPreferences({
                          ...preferences,
                          notifyOnLlmsTxtChange: checked,
                        })
                      }
                      data-testid="switch-llms"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="bot-permission-change"
                      className="text-sm font-normal"
                    >
                      Bot permissions change
                    </Label>
                    <Switch
                      id="bot-permission-change"
                      checked={preferences.notifyOnBotPermissionChange}
                      onCheckedChange={(checked) =>
                        setPreferences({
                          ...preferences,
                          notifyOnBotPermissionChange: checked,
                        })
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
                        setPreferences({
                          ...preferences,
                          notifyOnNewErrors: checked,
                        })
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
                  onValueChange={(value: NotificationMethod) =>
                    setPreferences({ ...preferences, notificationMethod: value })
                  }
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
              onClick={resetDialog}
              data-testid="button-cancel-preferences"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSavePreferences}
              disabled={saveMutation.isPending || !preferences}
              className="bg-primary text-primary-foreground hover:bg-primary/90 btn-hover-lift"
              data-testid="button-save-preferences"
            >
              {saveMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
);
