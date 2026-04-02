// client/src/hooks/useAsyncScan.ts
// Hook for async scanning with job polling support
// Handles both sync and async scan modes seamlessly

import { useState, useCallback, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { calculateLevel } from "@shared/gamification";
import { queryKeys } from "@/lib/queryKeys";

// Sync scan response type (original format)
export interface SyncScanResult {
  id: number;
  url: string;
  robotsTxtFound: boolean;
  robotsTxtContent: string | null;
  llmsTxtFound: boolean;
  llmsTxtContent: string | null;
  botPermissions: Record<string, string>;
  errors: string[];
  warnings: string[];
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

// Scan job status response type
export interface ScanJobStatus {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  url: string;
  progress: number;
  progressMessage: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  scanId?: number;
  error?: string;
  gamification?: SyncScanResult['gamification'];
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
  };
}

// Async scan initial response
interface AsyncScanInitiated {
  jobId: string;
  status: 'pending';
  url: string;
  message: string;
  _links: {
    status: string;
  };
}

interface UseAsyncScanOptions {
  // Use async mode (default: auto-detect based on environment)
  async?: boolean;
  // Polling interval in ms (default: 1000ms)
  pollInterval?: number;
  // Maximum poll attempts before giving up (default: 120 = 2 minutes)
  maxPollAttempts?: number;
  // Callbacks
  onProgress?: (progress: number, message: string) => void;
  onComplete?: (result: SyncScanResult) => void;
  onError?: (error: string) => void;
}

interface UseAsyncScanState {
  isScanning: boolean;
  progress: number;
  progressMessage: string;
  error: string | null;
  result: SyncScanResult | null;
  jobId: string | null;
}

export function useAsyncScan(options: UseAsyncScanOptions = {}) {
  const {
    async: forceAsync,
    pollInterval = 1000,
    maxPollAttempts = 120,
    onProgress,
    onComplete,
    onError,
  } = options;

  const queryClient = useQueryClient();
  const pollCountRef = useRef(0);
  // Generation counter: incremented on each new scan() call to invalidate stale poll chains
  const generationRef = useRef(0);
  const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [state, setState] = useState<UseAsyncScanState>({
    isScanning: false,
    progress: 0,
    progressMessage: '',
    error: null,
    result: null,
    jobId: null,
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      generationRef.current++;
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Poll for scan job status
   */
  const pollJobStatus = useCallback(async (jobId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/scan-jobs/${jobId}/status`, {
        credentials: "include",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to get scan status');
      }

      const jobStatus: ScanJobStatus = await res.json();

      // Update progress
      setState(prev => ({
        ...prev,
        progress: jobStatus.progress,
        progressMessage: jobStatus.progressMessage || '',
      }));
      onProgress?.(jobStatus.progress, jobStatus.progressMessage || '');

      // Check completion status
      if (jobStatus.status === 'completed' && jobStatus.result) {
        // Convert to sync result format
        const result: SyncScanResult = {
          id: jobStatus.result.id,
          url: jobStatus.result.url,
          robotsTxtFound: jobStatus.result.robotsTxtFound,
          robotsTxtContent: jobStatus.result.robotsTxtContent,
          llmsTxtFound: jobStatus.result.llmsTxtFound,
          llmsTxtContent: jobStatus.result.llmsTxtContent,
          botPermissions: jobStatus.result.botPermissions,
          errors: jobStatus.result.errors,
          warnings: jobStatus.result.warnings,
          gamification: jobStatus.gamification,
        };

        setState(prev => ({
          ...prev,
          isScanning: false,
          progress: 100,
          progressMessage: 'Scan complete!',
          result,
          error: null,
        }));

        // Invalidate queries
        queryClient.invalidateQueries({ queryKey: queryKeys.auth.user });
        queryClient.invalidateQueries({ queryKey: queryKeys.userScans.root });

        onComplete?.(result);
        return true; // Polling complete
      }

      if (jobStatus.status === 'failed') {
        const errorMsg = jobStatus.error || 'Scan failed';
        setState(prev => ({
          ...prev,
          isScanning: false,
          error: errorMsg,
        }));
        onError?.(errorMsg);
        return true; // Polling complete (with error)
      }

      return false; // Continue polling
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({
        ...prev,
        isScanning: false,
        error: errorMsg,
      }));
      onError?.(errorMsg);
      return true; // Stop polling on error
    }
  }, [queryClient, onProgress, onComplete, onError]);

  /**
   * Start polling for job status using recursive setTimeout.
   * A generation number is captured at start; if a newer scan() call
   * increments generationRef, this polling chain self-terminates.
   */
  const startPolling = useCallback((jobId: string, generation: number) => {
    pollCountRef.current = 0;

    const schedulePoll = () => {
      pollTimeoutRef.current = setTimeout(async () => {
        // Bail out if a newer scan has started
        if (generationRef.current !== generation) return;

        pollCountRef.current++;

        if (pollCountRef.current > maxPollAttempts) {
          setState(prev => ({
            ...prev,
            isScanning: false,
            error: 'Scan timed out. Please try again.',
          }));
          onError?.('Scan timed out. Please try again.');
          return;
        }

        const isDone = await pollJobStatus(jobId);
        // Schedule next poll only if still in this generation and not finished
        if (!isDone && generationRef.current === generation) {
          schedulePoll();
        }
      }, pollInterval);
    };

    schedulePoll();
  }, [pollInterval, maxPollAttempts, pollJobStatus, onError]);

  /**
   * Perform optimistic UI update for gamification
   */
  const optimisticUpdate = useCallback(() => {
    const previousUser = queryClient.getQueryData<User>(queryKeys.auth.user);
    
    if (previousUser) {
      const estimatedXpGain = 10;
      const newXp = (previousUser.xp || 0) + estimatedXpGain;
      const newLevel = calculateLevel(newXp);

      queryClient.setQueryData<User>(queryKeys.auth.user, {
        ...previousUser,
        xp: newXp,
        level: newLevel,
      });
    }

    return previousUser;
  }, [queryClient]);

  /**
   * Initiate a scan (supports both sync and async modes)
   */
  const scan = useCallback(async (url: string, tags?: string[]) => {
    // Reset state
    setState({
      isScanning: true,
      progress: 0,
      progressMessage: 'Starting scan...',
      error: null,
      result: null,
      jobId: null,
    });

    // Invalidate any in-flight polling chain from a previous scan
    generationRef.current++;
    const currentGeneration = generationRef.current;
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }

    // Optimistic UI update
    const previousUser = optimisticUpdate();

    try {
      // Determine if we should use async mode
      // Default to async=true for better UX and Vercel compatibility
      const useAsync = forceAsync !== false;
      const queryParam = useAsync ? '?async=true' : '';

      const res = await fetch(`/api/scan${queryParam}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, tags }),
        credentials: "include",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Scan failed');
      }

      // Check response status to determine sync vs async
      if (res.status === 202) {
        // Async mode - job was queued
        const asyncResponse: AsyncScanInitiated = await res.json();
        
        setState(prev => ({
          ...prev,
          jobId: asyncResponse.jobId,
          progressMessage: 'Scan queued...',
        }));

        // Start polling for job status
        startPolling(asyncResponse.jobId, currentGeneration);
      } else {
        // Sync mode - result is immediate
        const syncResult: SyncScanResult = await res.json();
        
        setState(prev => ({
          ...prev,
          isScanning: false,
          progress: 100,
          progressMessage: 'Scan complete!',
          result: syncResult,
        }));

        // Invalidate queries
        queryClient.invalidateQueries({ queryKey: queryKeys.auth.user });
        queryClient.invalidateQueries({ queryKey: queryKeys.userScans.root });

        onComplete?.(syncResult);
      }
    } catch (error) {
      // Rollback optimistic update
      if (previousUser) {
        queryClient.setQueryData(queryKeys.auth.user, previousUser);
      }

      const errorMsg = error instanceof Error ? error.message : 'Scan failed';
      setState(prev => ({
        ...prev,
        isScanning: false,
        error: errorMsg,
      }));
      onError?.(errorMsg);
    }
  }, [forceAsync, queryClient, optimisticUpdate, startPolling, onComplete, onError]);

  /**
   * Cancel any ongoing scan polling
   */
  const cancel = useCallback(() => {
    generationRef.current++;
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
    setState(prev => ({
      ...prev,
      isScanning: false,
      progressMessage: 'Scan cancelled',
    }));
  }, []);

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    generationRef.current++;
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
    setState({
      isScanning: false,
      progress: 0,
      progressMessage: '',
      error: null,
      result: null,
      jobId: null,
    });
  }, []);

  return {
    ...state,
    scan,
    cancel,
    reset,
  };
}

