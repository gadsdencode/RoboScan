import { useCallback, useEffect } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import type { DriveStep } from "driver.js";

export interface UseBuilderTourOptions {
  steps: DriveStep[];
  /** localStorage key set when the tour completes (value `"true"`). */
  storageKey: string;
  /**
   * When false, first-visit auto-start is skipped (e.g. wait until premium config loads).
   * Default true.
   */
  autoStartEnabled?: boolean;
  /** Delay before auto-start on first visit. Default 1000. */
  autoStartDelayMs?: number;
}

export function useBuilderTour({
  steps,
  storageKey,
  autoStartEnabled = true,
  autoStartDelayMs = 1000,
}: UseBuilderTourOptions) {
  const runTour = useCallback(() => {
    const driverObj = driver({
      showProgress: true,
      steps,
      popoverClass: "roboscan-driver-popover",
      onDestroyed: () => {
        localStorage.setItem(storageKey, "true");
      },
    });
    driverObj.drive();
  }, [steps, storageKey]);

  useEffect(() => {
    if (!autoStartEnabled) return;
    const hasSeenTour = localStorage.getItem(storageKey);
    if (hasSeenTour) return;
    const id = window.setTimeout(() => {
      runTour();
    }, autoStartDelayMs);
    return () => window.clearTimeout(id);
  }, [storageKey, autoStartEnabled, autoStartDelayMs, runTour]);

  return { runTour };
}
