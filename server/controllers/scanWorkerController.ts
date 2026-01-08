// server/controllers/scanWorkerController.ts
// Background worker endpoint for async scan processing via QStash
// This endpoint is called by QStash to perform the actual website scan

import { Router, Request, Response } from "express";
import { Receiver } from "@upstash/qstash";
import { storage } from "../storage.js";
import { scanWebsite } from "../scanner.js";
import { calculateScanScore } from "../report-generator.js";
import { calculateLevel, calculateXpWithMultiplier } from "../gamification.js";
import { normalizeDomainForCooldown } from "../domain-utils.js";
import type { ScanJobStatus } from "../../shared/schema.js";

const router = Router();

// QStash signature verification receiver
let receiver: Receiver | null = null;

function getReceiver(): Receiver | null {
  if (!process.env.QSTASH_CURRENT_SIGNING_KEY || !process.env.QSTASH_NEXT_SIGNING_KEY) {
    console.warn('[ScanWorker] QStash signing keys not configured - signature verification disabled');
    return null;
  }

  if (!receiver) {
    receiver = new Receiver({
      currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY,
      nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY,
    });
  }

  return receiver;
}

/**
 * Verify QStash signature (security)
 */
async function verifyQStashSignature(req: Request): Promise<boolean> {
  const recv = getReceiver();
  if (!recv) {
    // In development without keys, allow requests (for testing)
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[ScanWorker] Skipping signature verification in development');
      return true;
    }
    return false;
  }

  const signature = req.headers['upstash-signature'] as string;
  if (!signature) {
    console.error('[ScanWorker] Missing upstash-signature header');
    return false;
  }

  try {
    const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    await recv.verify({
      signature,
      body,
    });
    return true;
  } catch (error) {
    console.error('[ScanWorker] Signature verification failed:', error);
    return false;
  }
}

interface ScanJobPayload {
  jobId: string;
  url: string;
  userId?: string;
  tags: string[];
}

/**
 * POST /api/scan-worker
 * Background worker endpoint - called by QStash to perform scans
 * This runs asynchronously and updates the scan job status
 */
router.post('/', async (req: Request, res: Response) => {
  console.log('[ScanWorker] Received scan job request');

  // Verify QStash signature for security
  const isValid = await verifyQStashSignature(req);
  if (!isValid) {
    console.error('[ScanWorker] Invalid or missing QStash signature');
    return res.status(401).json({ message: 'Unauthorized - invalid signature' });
  }

  const payload = req.body as ScanJobPayload;
  const { jobId, url, userId, tags } = payload;

  if (!jobId || !url) {
    console.error('[ScanWorker] Missing required fields:', { jobId, url });
    return res.status(400).json({ message: 'Missing required fields: jobId, url' });
  }

  console.log(`[ScanWorker] Processing job ${jobId} for URL: ${url}`);

  try {
    // Update job status to processing
    await storage.updateScanJobStatus(jobId, 'processing', {
      progress: 10,
      progressMessage: 'Initializing scan...',
    });

    // Perform the actual scan
    await storage.updateScanJobStatus(jobId, 'processing', {
      progress: 20,
      progressMessage: 'Connecting to website...',
    });

    const result = await scanWebsite(url);

    await storage.updateScanJobStatus(jobId, 'processing', {
      progress: 70,
      progressMessage: 'Processing scan results...',
    });

    // Calculate score
    const tempScanObj = {
      ...result,
      url,
      id: 0,
      userId,
      createdAt: new Date(),
      tags: tags || [],
      score: 0,
      sitemapXmlFound: result.sitemapXmlFound ?? false,
      securityTxtFound: result.securityTxtFound ?? false,
      manifestJsonFound: result.manifestJsonFound ?? false,
      adsTxtFound: result.adsTxtFound ?? false,
      humansTxtFound: result.humansTxtFound ?? false,
      aiTxtFound: result.aiTxtFound ?? false,
    };
    const score = calculateScanScore(tempScanObj as any);

    await storage.updateScanJobStatus(jobId, 'processing', {
      progress: 80,
      progressMessage: 'Saving scan data...',
    });

    // Save the scan to database
    const scan = await storage.createScan({
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
      tags: tags || [],
    });

    await storage.updateScanJobStatus(jobId, 'processing', {
      progress: 90,
      progressMessage: 'Calculating gamification...',
    });

    // Handle gamification for authenticated users
    let gamificationUpdates = null;
    if (userId) {
      const canonicalDomain = normalizeDomainForCooldown(url);
      
      if (canonicalDomain) {
        const [currentUser, subscription, isOnCooldown] = await Promise.all([
          storage.getUser(userId),
          storage.getUserActiveSubscription(userId),
          storage.checkDomainCooldown(userId, canonicalDomain),
        ]);
        const isSubscriber = !!subscription;

        if (currentUser && !isOnCooldown) {
          let baseXpGain = 10;

          if (result.robotsTxtFound && result.llmsTxtFound) {
            baseXpGain += 40;
          }

          const xpGain = calculateXpWithMultiplier(baseXpGain, isSubscriber);
          const currentXp = currentUser.xp || 0;
          const newXp = currentXp + xpGain;
          const newLevel = calculateLevel(newXp);
          const oldLevel = currentUser.level || 1;

          await storage.updateUserGamificationStats(userId, newXp, newLevel);
          await storage.upsertDomainCooldown(userId, canonicalDomain);

          gamificationUpdates = {
            xpGained: xpGain,
            baseXp: baseXpGain,
            multiplier: isSubscriber ? 2 : 1,
            totalXp: newXp,
            newLevel: newLevel,
            levelUp: newLevel > oldLevel,
            isSubscriber,
          };
        }
      }
    }

    // Mark job as completed
    await storage.updateScanJobStatus(jobId, 'completed', {
      scanId: scan.id,
      progress: 100,
      progressMessage: 'Scan completed successfully',
    });

    console.log(`[ScanWorker] Job ${jobId} completed successfully, scan ID: ${scan.id}`);

    // Return scan result for QStash callback
    res.status(200).json({
      success: true,
      jobId,
      scanId: scan.id,
      gamification: gamificationUpdates,
      result: {
        robotsTxtFound: scan.robotsTxtFound,
        llmsTxtFound: scan.llmsTxtFound,
        sitemapXmlFound: scan.sitemapXmlFound,
        securityTxtFound: scan.securityTxtFound,
        manifestJsonFound: scan.manifestJsonFound,
        adsTxtFound: scan.adsTxtFound,
        humansTxtFound: scan.humansTxtFound,
        aiTxtFound: scan.aiTxtFound,
        score,
      },
    });
  } catch (error) {
    console.error(`[ScanWorker] Job ${jobId} failed:`, error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    // Mark job as failed
    await storage.updateScanJobStatus(jobId, 'failed', {
      error: errorMessage,
      progress: 0,
      progressMessage: `Scan failed: ${errorMessage}`,
    });

    // Return error response (QStash will handle retries)
    res.status(500).json({
      success: false,
      jobId,
      error: errorMessage,
    });
  }
});

/**
 * POST /api/scan-callback
 * Callback endpoint for QStash to notify of job completion
 * This updates the job status based on the worker response
 */
router.post('/callback', async (req: Request, res: Response) => {
  console.log('[ScanCallback] Received callback');

  // Verify QStash signature
  const isValid = await verifyQStashSignature(req);
  if (!isValid) {
    console.error('[ScanCallback] Invalid or missing QStash signature');
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    // QStash callback body contains base64-encoded response
    const { body, status, sourceMessageId, url } = req.body;
    
    if (body) {
      // Decode base64 response body
      const decodedBody = Buffer.from(body, 'base64').toString('utf-8');
      const workerResponse = JSON.parse(decodedBody);
      
      console.log(`[ScanCallback] Worker response for job ${workerResponse.jobId}:`, {
        success: workerResponse.success,
        scanId: workerResponse.scanId,
        status,
      });

      // Job status already updated by worker, callback is informational
      // Could be used for additional logging or notifications
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('[ScanCallback] Error processing callback:', error);
    res.status(200).json({ received: true, error: 'Processing error' });
  }
});

export default router;

