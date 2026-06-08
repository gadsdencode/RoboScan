import { useEffect } from "react";

const MARKER_NAME = "prerender-ready";

/** Signals build-time prerender snapshots that React content + helmet tags are ready. */
export function usePrerenderReady() {
  useEffect(() => {
    const marker = document.createElement("meta");
    marker.setAttribute("name", MARKER_NAME);
    marker.setAttribute("content", "true");
    document.head.appendChild(marker);
    document.dispatchEvent(new Event("prerender-ready"));

    return () => {
      marker.remove();
    };
  }, []);
}

export const PRERENDER_READY_SELECTOR = `meta[name="${MARKER_NAME}"]`;
