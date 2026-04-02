// server/services/scanService.ts
// Core scanning service - orchestrates website scanning, score calculation, and persistence

import { storage } from "../storage.js";
import { scanWebsite } from "../scanner.js";
import { calculateScanScore } from "../report-generator.js";
import { normalizeDomainForCooldown } from "../domain-utils.js";
import { isQStashEnabled, publishScanJob } from "../utils/qstash.js";
import type { Scan, InsertScan } from "../../shared/schema.js";

/**
 * Result of a synchronous scan operation
 */
export interface SyncScanResult {
  scan: Scan;
  canonicalDomain: string;
  isOnCooldown: boolean;
  scanData: {
    robotsTxtFound: boolean;
    llmsTxtFound: boolean;
    botPermissions: Record<string, string>;
  };
}

/**
 * Result of an async scan initialization
 */
export interface AsyncScanResult {
  jobId: string;
  status: 'pending';
  url: string;
  message: string;
  _links: {
    status: string;
  };
}

/**
 * Validates and normalizes a URL for scanning.
 * Returns the canonical domain or null if invalid.
 */
export function validateScanUrl(url: string): string | null {
  return normalizeDomainForCooldown(url);
}

/**
 * Determines if async mode should be used based on request and environment.
 */
export function shouldUseAsyncMode(
  queryAsync: string | undefined,
  isVercel: boolean = !!process.env.VERCEL
): boolean {
  const useAsync = queryAsync === 'true' || queryAsync === '1';
  return (useAsync || isVercel) && isQStashEnabled();
}

/**
 * Performs a synchronous website scan.
 * 
 * Orchestrates:
 * 1. Domain cooldown check (for XP purposes)
 * 2. Website scanning via scanner.ts
 * 3. Score calculation
 * 4. Database persistence
 * 
 * @param url - The URL to scan
 * @param userId - Optional user ID for authenticated scans
 * @param tags - Optional tags to associate with the scan
 * @returns Scan result with metadata
 */
export async function performSyncScan(
  url: string,
  userId: string | undefined,
  tags: string[] = []
): Promise<SyncScanResult> {
  const canonicalDomain = normalizeDomainForCooldown(url);
  if (!canonicalDomain) {
    throw new Error("Invalid URL format: Could not parse domain from URL");
  }

  // Check cooldown status for authenticated users
  let isOnCooldown = false;
  if (userId) {
    isOnCooldown = await storage.checkDomainCooldown(userId, canonicalDomain);
  }

  // Perform the actual scan
  const result = await scanWebsite(url);

  // Build temporary scan object for score calculation
  const tempScanObj = {
    ...result,
    url,
    id: 0,
    userId,
    createdAt: new Date(),
    tags,
    score: 0,
    sitemapXmlFound: result.sitemapXmlFound ?? false,
    securityTxtFound: result.securityTxtFound ?? false,
    manifestJsonFound: result.manifestJsonFound ?? false,
    adsTxtFound: result.adsTxtFound ?? false,
    humansTxtFound: result.humansTxtFound ?? false,
    aiTxtFound: result.aiTxtFound ?? false,
  };
  
  const score = calculateScanScore(tempScanObj as any);

  // Persist to database
  const scanData: InsertScan = {
    userId,
    url,
    robotsTxtFound: result.robotsTxtFound,
    robotsTxtContent: result.robotsTxtContent,
    llmsTxtFound: result.llmsTxtFound,
    llmsTxtContent: result.llmsTxtContent,
    sitemapXmlFound: result.sitemapXmlFound,
    sitemapXmlContent: result.sitemapXmlContent,
    securityTxtFound: result.securityTxtFound,
    securityTxtContent: result.securityTxtContent,
    manifestJsonFound: result.manifestJsonFound,
    manifestJsonContent: result.manifestJsonContent,
    adsTxtFound: result.adsTxtFound,
    adsTxtContent: result.adsTxtContent,
    humansTxtFound: result.humansTxtFound,
    humansTxtContent: result.humansTxtContent,
    aiTxtFound: result.aiTxtFound,
    aiTxtContent: result.aiTxtContent,
    botPermissions: result.botPermissions,
    errors: result.errors,
    warnings: result.warnings,
    score,
    tags,
  };

  const scan = await storage.createScan(scanData);

  return {
    scan,
    canonicalDomain,
    isOnCooldown,
    scanData: {
      robotsTxtFound: result.robotsTxtFound,
      llmsTxtFound: result.llmsTxtFound,
      botPermissions: result.botPermissions,
    },
  };
}

/**
 * Initializes an asynchronous scan job.
 * 
 * Creates a scan job in the database and publishes it to QStash
 * for background processing. Returns immediately with job details.
 * 
 * @param url - The URL to scan
 * @param userId - Optional user ID for authenticated scans
 * @param tags - Optional tags to associate with the scan
 * @returns Async scan result with job ID and polling endpoint
 */
export async function initializeAsyncScan(
  url: string,
  userId: string | undefined,
  tags: string[] = []
): Promise<AsyncScanResult> {
  console.log(`[ScanService] Initiating async scan for ${url}`);

  // Create scan job in database
  const scanJob = await storage.createScanJob({
    userId,
    url,
    tags,
    status: 'pending',
    progress: 0,
    progressMessage: 'Scan queued...',
  });

  console.log(`[ScanService] Created scan job: ${scanJob.id}`);

  // Publish job to QStash for background processing
  const qstashResult = await publishScanJob(scanJob.id, url, userId, tags);

  if (qstashResult) {
    // Update job with QStash message ID
    await storage.updateScanJobStatus(scanJob.id, 'pending', {
      qstashMessageId: qstashResult.messageId,
      progressMessage: 'Scan queued, starting shortly...',
    });

    console.log(`[ScanService] Published to QStash: ${qstashResult.messageId}`);
  } else {
    // QStash publish failed - mark job as failed
    await storage.updateScanJobStatus(scanJob.id, 'failed', {
      error: 'Failed to queue scan job',
      progressMessage: 'Failed to start scan',
    });

    throw new Error('Failed to queue scan job: QStash publish failed');
  }

  return {
    jobId: scanJob.id,
    status: 'pending',
    url,
    message: 'Scan queued for processing',
    _links: {
      status: `/api/scan-jobs/${scanJob.id}/status`,
    },
  };
}

/**
 * Formats a user-friendly error message for scan failures.
 */
export function formatScanError(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Failed to scan website";
  }

  const message = error.message;

  // Enhance common error messages for better UX
  if (message.includes('DNS')) {
    return "DNS resolution failed: Unable to resolve the domain name. Please check if the website URL is correct.";
  }
  if (message.includes('timeout')) {
    return "Connection timeout: The website did not respond within the time limit. The server may be down or unreachable.";
  }
  if (message.includes('refused') || message.includes('ECONNREFUSED')) {
    return "Connection refused: The website server is not accepting connections. The server may be down or blocking requests.";
  }
  if (message.includes('certificate') || message.includes('SSL') || message.includes('TLS')) {
    return "SSL/TLS certificate error: Unable to establish a secure connection. The website's certificate may be invalid or expired.";
  }

  return message;
}
