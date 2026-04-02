import { useCallback, useState, type RefObject } from "react";
import type { RecurringScan } from "@/components/dashboard/RecurringScans";
import type { SettingsPanelHandle } from "@/components/dashboard/SettingsPanel";

export function useRecurringScans(
  settingsPanelRef: RefObject<SettingsPanelHandle | null>
) {
  const [recurringScans, setRecurringScans] = useState<RecurringScan[]>([]);

  const onRecurringScansChange = useCallback((list: RecurringScan[]) => {
    setRecurringScans(list);
  }, []);

  const openPreferences = useCallback((scan: RecurringScan) => {
    void settingsPanelRef.current?.openPreferences(scan);
  }, [settingsPanelRef]);

  return {
    recurringScans,
    onRecurringScansChange,
    openPreferences,
  };
}
