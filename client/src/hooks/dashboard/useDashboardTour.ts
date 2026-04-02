import { useCallback, useEffect } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { getDashboardTourSteps } from "@/lib/tour-config";

export function useDashboardTour(loading: boolean, scansLength: number) {
  const runTour = useCallback(() => {
    const steps = getDashboardTourSteps();
    if (steps.length === 0) return;

    const driverObj = driver({
      showProgress: true,
      steps,
      popoverClass: "roboscan-driver-popover",
      onDestroyed: () => {
        localStorage.setItem("roboscan_tour_seen", "true");
      },
    });

    driverObj.drive();
  }, []);

  useEffect(() => {
    const hasSeenTour = localStorage.getItem("roboscan_tour_seen");
    if (!hasSeenTour && !loading && scansLength === 0) {
      setTimeout(runTour, 1000);
    }
  }, [loading, scansLength, runTour]);

  return { runTour };
}
