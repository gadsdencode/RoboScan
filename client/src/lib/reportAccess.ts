const REPORT_ACCESS_TOKEN_PREFIX = "report-access:";

function keyForScan(scanId: number) {
  return `${REPORT_ACCESS_TOKEN_PREFIX}${scanId}`;
}

export function setReportAccessToken(scanId: number, token: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(keyForScan(scanId), token);
}

export function getReportAccessToken(scanId: number): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(keyForScan(scanId));
}
