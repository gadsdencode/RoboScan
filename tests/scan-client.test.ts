import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  pollScanJob,
  runScanToCompletion,
  scanWebsite,
} from "../client/src/lib/scan-client.ts";

function jsonResponse(data: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    status: init?.status ?? 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("scan-client", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("scanWebsite returns sync result on 200", async () => {
    const payload = {
      id: 1,
      url: "https://example.com",
      robotsTxtFound: true,
      robotsTxtContent: "User-agent: *",
      llmsTxtFound: false,
      llmsTxtContent: null,
      botPermissions: {},
      errors: [],
      warnings: [],
    };
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(payload));

    const out = await scanWebsite({ url: "https://example.com" });
    expect(out.kind).toBe("sync");
    if (out.kind === "sync") {
      expect(out.result.id).toBe(1);
    }
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("scanWebsite returns async job id on 202", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ jobId: "job-abc" }, { status: 202 })
    );

    const out = await scanWebsite({ url: "https://example.com" });
    expect(out.kind).toBe("async");
    if (out.kind === "async") {
      expect(out.jobId).toBe("job-abc");
    }
  });

  it("runScanToCompletion polls until completed", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        jsonResponse({ jobId: "j1" }, { status: 202 })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          jobId: "j1",
          status: "processing",
          url: "https://a.com",
          progress: 50,
          progressMessage: "working",
          createdAt: "",
          startedAt: null,
          completedAt: null,
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          jobId: "j1",
          status: "completed",
          url: "https://a.com",
          progress: 100,
          progressMessage: "done",
          createdAt: "",
          startedAt: null,
          completedAt: null,
          result: {
            id: 2,
            url: "https://a.com",
            robotsTxtFound: true,
            robotsTxtContent: "",
            llmsTxtFound: false,
            llmsTxtContent: null,
            botPermissions: {},
            errors: [],
            warnings: [],
          },
        })
      );

    const onProgress = vi.fn();
    const onQueued = vi.fn();

    const result = await runScanToCompletion(
      { url: "https://a.com" },
      {
        pollIntervalMs: 0,
        maxAttempts: 10,
        onProgress,
        onQueued,
      }
    );

    expect(onQueued).toHaveBeenCalledWith("j1");
    expect(onProgress).toHaveBeenCalled();
    expect(result.id).toBe(2);
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("pollScanJob throws on failed status", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({
        jobId: "j1",
        status: "failed",
        url: "https://a.com",
        progress: 0,
        progressMessage: null,
        createdAt: "",
        startedAt: null,
        completedAt: null,
        error: "boom",
      })
    );

    await expect(
      pollScanJob("j1", { pollIntervalMs: 0, maxAttempts: 3 })
    ).rejects.toThrow("boom");
  });

  it("pollScanJob times out when job never completes", async () => {
    vi.mocked(fetch).mockImplementation(() =>
      Promise.resolve(
        jsonResponse({
          jobId: "j1",
          status: "processing",
          url: "https://a.com",
          progress: 1,
          progressMessage: null,
          createdAt: "",
          startedAt: null,
          completedAt: null,
        })
      )
    );

    await expect(
      pollScanJob("j1", { pollIntervalMs: 0, maxAttempts: 2 })
    ).rejects.toThrow("Scan timed out");
  });

  it("pollScanJob aborts when signal fires", async () => {
    const ac = new AbortController();
    vi.mocked(fetch).mockImplementation(() => {
      ac.abort();
      return Promise.resolve(
        jsonResponse({
          jobId: "j1",
          status: "processing",
          url: "https://a.com",
          progress: 0,
          progressMessage: null,
          createdAt: "",
          startedAt: null,
          completedAt: null,
        })
      );
    });

    await expect(
      pollScanJob("j1", {
        pollIntervalMs: 0,
        maxAttempts: 10,
        signal: ac.signal,
      })
    ).rejects.toMatchObject({ name: "AbortError" });
  });
});
