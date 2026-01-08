// server/utils/qstash.ts
// QStash client configuration for background job processing
// Uses Upstash QStash for reliable async scanning on Vercel serverless

import { Client } from "@upstash/qstash";

// Singleton QStash client instance
let qstashClient: Client | null = null;

/**
 * Get or create the QStash client instance
 * Returns null if QSTASH_TOKEN is not configured (allows graceful degradation)
 */
export function getQStashClient(): Client | null {
  if (!process.env.QSTASH_TOKEN) {
    console.warn('[QStash] QSTASH_TOKEN not configured - async scanning disabled');
    return null;
  }

  if (!qstashClient) {
    qstashClient = new Client({
      token: process.env.QSTASH_TOKEN,
    });
    console.log('[QStash] Client initialized');
  }

  return qstashClient;
}

/**
 * Check if QStash is configured and available
 */
export function isQStashEnabled(): boolean {
  return !!process.env.QSTASH_TOKEN;
}

/**
 * Get the base URL for QStash callbacks
 * In production, this should be the deployed app URL
 * In development, you can use a tunnel service (ngrok, localtunnel)
 */
export function getQStashBaseUrl(): string {
  // Production: Use VERCEL_URL or custom domain
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  
  // Custom base URL override
  if (process.env.QSTASH_BASE_URL) {
    return process.env.QSTASH_BASE_URL;
  }

  // Development fallback (won't work without tunnel)
  return process.env.NODE_ENV === 'production' 
    ? 'https://your-production-domain.vercel.app'
    : 'http://localhost:5000';
}

/**
 * Publish a scan job to QStash for background processing
 */
export async function publishScanJob(
  jobId: string,
  url: string,
  userId: string | undefined,
  tags: string[]
): Promise<{ messageId: string } | null> {
  const client = getQStashClient();
  if (!client) {
    return null;
  }

  const baseUrl = getQStashBaseUrl();
  const workerUrl = `${baseUrl}/api/scan-worker`;
  const callbackUrl = `${baseUrl}/api/scan-callback`;

  try {
    const result = await client.publishJSON({
      url: workerUrl,
      body: {
        jobId,
        url,
        userId,
        tags,
      },
      // Callback when scan completes (success or failure)
      callback: callbackUrl,
      failureCallback: callbackUrl,
      // Retry configuration for reliability
      retries: 3,
      // Timeout for slow websites (45 seconds - leaving buffer before Vercel 60s limit)
      timeout: "45s",
    });

    console.log(`[QStash] Published scan job ${jobId}, messageId: ${result.messageId}`);
    return { messageId: result.messageId };
  } catch (error) {
    console.error('[QStash] Failed to publish scan job:', error);
    throw error;
  }
}

/**
 * Environment variable requirements for QStash:
 * 
 * Required:
 * - QSTASH_TOKEN: Your QStash API token from Upstash console
 * - QSTASH_CURRENT_SIGNING_KEY: For verifying webhook signatures
 * - QSTASH_NEXT_SIGNING_KEY: For key rotation
 * 
 * Optional:
 * - QSTASH_BASE_URL: Override the base URL for callbacks
 * - VERCEL_URL: Automatically set by Vercel
 */

