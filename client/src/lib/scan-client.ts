/**
 * Canonical client-side scan API: POST /api/scan and poll /api/scan-jobs/:id/status.
 * All scan entry points should use these utilities instead of bespoke fetch loops.
 */

export const DEFAULT_SCAN_POLL_INTERVAL_MS = 1000;
export const DEFAULT_SCAN_MAX_POLL_ATTEMPTS = 120;

/** Sync scan JSON body (200) or merged async completion payload */
export interface SyncScanResult {
  id: number;
  url: string;
  robotsTxtFound: boolean;
  robotsTxtContent: string | null;
  llmsTxtFound: boolean;
  llmsTxtContent: string | null;
  sitemapXmlFound?: boolean;
  sitemapXmlContent?: string | null;
  securityTxtFound?: boolean;
  securityTxtContent?: string | null;
  manifestJsonFound?: boolean;
  manifestJsonContent?: string | null;
  adsTxtFound?: boolean;
  adsTxtContent?: string | null;
  humansTxtFound?: boolean;
  humansTxtContent?: string | null;
  aiTxtFound?: boolean;
  aiTxtContent?: string | null;
  botPermissions: Record<string, string>;
  errors: string[];
  warnings: string[];
  score?: number;
  /** Signed token for the public share view (/s/:token). */
  shareToken?: string;
  gamification?: {
    xpGained: number;
    baseXp?: number;
    multiplier?: number;
    totalXp: number;
    newLevel: number;
    levelUp: boolean;
    cooldownActive?: boolean;
    isSubscriber?: boolean;
    achievementsUnlocked?: Array<{ key: string; name: string; xpReward: number }>;
  };
}

export interface ScanJobStatus {
  jobId: string;
  status: "pending" | "processing" | "completed" | "failed";
  url: string;
  progress: number;
  progressMessage: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  scanId?: number;
  error?: string;
  gamification?: SyncScanResult["gamification"];
  result?: {
    id: number;
    url: string;
    robotsTxtFound: boolean;
    robotsTxtContent: string | null;
    llmsTxtFound: boolean;
    llmsTxtContent: string | null;
    sitemapXmlFound?: boolean;
    securityTxtFound?: boolean;
    manifestJsonFound?: boolean;
    adsTxtFound?: boolean;
    humansTxtFound?: boolean;
    aiTxtFound?: boolean;
    botPermissions: Record<string, string>;
    errors: string[];
    warnings: string[];
    score?: number;
    shareToken?: string;
  };
}

export interface ScanWebsiteParams {
  url: string;
  tags?: string[];
}

export interface ScanWebsiteOptions {
  /**
   * When true (default), uses `?async=true`. When false, relies on server sync response.
   */
  async?: boolean;
  credentials?: RequestCredentials;
  signal?: AbortSignal;
}

export type ScanStartResult =
  | { kind: "sync"; result: ScanCompletionResult }
  | { kind: "async"; jobId: string };

export type ScanCompletionResult = SyncScanResult;

export interface PollScanJobOptions {
  pollIntervalMs?: number;
  maxAttempts?: number;
  credentials?: RequestCredentials;
  signal?: AbortSignal;
  onProgress?: (progress: number, message: string) => void;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const t = setTimeout(resolve, ms);
    const onAbort = () => {
      clearTimeout(t);
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export async function parseScanErrorResponse(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { message?: string };
    return data.message ?? `Scan failed (${res.status})`;
  } catch {
    return `Scan failed (${res.status})`;
  }
}

/**
 * POST /api/scan. Returns either immediate sync JSON or a job id for async mode.
 */
export async function scanWebsite(
  params: ScanWebsiteParams,
  options: ScanWebsiteOptions = {}
): Promise<ScanStartResult> {
  const { async: useAsync = true, credentials = "include", signal } = options;
  const query = useAsync ? "?async=true" : "";
  const res = await fetch(`/api/scan${query}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: params.url, tags: params.tags }),
    credentials,
    signal,
  });

  if (!res.ok) {
    const message = await parseScanErrorResponse(res);
    throw new Error(message);
  }

  if (res.status === 202) {
    const body = (await res.json()) as { jobId: string };
    return { kind: "async", jobId: body.jobId };
  }

  const result = (await res.json()) as ScanCompletionResult;
  return { kind: "sync", result };
}

/**
 * Poll until the job completes, fails, times out, or the signal aborts.
 */
export async function pollScanJob(
  jobId: string,
  options: PollScanJobOptions = {}
): Promise<ScanCompletionResult> {
  const {
    pollIntervalMs = DEFAULT_SCAN_POLL_INTERVAL_MS,
    maxAttempts = DEFAULT_SCAN_MAX_POLL_ATTEMPTS,
    credentials = "include",
    signal,
    onProgress,
  } = options;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    await sleep(pollIntervalMs, signal);

    const res = await fetch(`/api/scan-jobs/${jobId}/status`, {
      credentials,
      signal,
    });

    if (!res.ok) {
      const message = await parseScanErrorResponse(res);
      throw new Error(message || "Failed to get scan status");
    }

    const status = (await res.json()) as ScanJobStatus;

    onProgress?.(status.progress, status.progressMessage ?? "");

    if (status.status === "completed" && status.result) {
      return {
        ...status.result,
        gamification: status.gamification,
      } as ScanCompletionResult;
    }

    if (status.status === "failed") {
      throw new Error(status.error ?? "Scan failed");
    }
  }

  throw new Error("Scan timed out");
}

export interface RunScanToCompletionOptions
  extends ScanWebsiteOptions,
    PollScanJobOptions {
  /** Called once when the server returns 202 and polling begins. */
  onQueued?: (jobId: string) => void;
}

/**
 * Full flow: start scan (sync or async) and, if queued, poll to completion.
 */
export async function runScanToCompletion(
  params: ScanWebsiteParams,
  options: RunScanToCompletionOptions = {}
): Promise<ScanCompletionResult> {
  const started = await scanWebsite(params, options);
  if (started.kind === "sync") {
    return started.result;
  }
  options.onQueued?.(started.jobId);
  return pollScanJob(started.jobId, options);
}
