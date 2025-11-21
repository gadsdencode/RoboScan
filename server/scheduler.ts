import { storage } from "./storage";
import { scanWebsite } from "./scanner";
import { detectChanges } from "./change-detector";
import pLimit from "p-limit";

// Calculate next run time based on frequency
function calculateNextRun(frequency: string): Date {
  const now = new Date();
  switch (frequency) {
    case 'daily':
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    case 'weekly':
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    case 'monthly':
      return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    default:
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
  }
}

// Process a single recurring scan
async function processRecurringScan(recurringScanId: number) {
  try {
    const recurringScan = await storage.getRecurringScan(recurringScanId);
    if (!recurringScan) return;

    console.log(`[Scheduler] Processing recurring scan #${recurringScanId} for ${recurringScan.url}`);

    // Run the scan
    const scanResult = await scanWebsite(recurringScan.url);
    
    // Save the new scan
    const newScan = await storage.createScan({
      userId: recurringScan.userId,
      url: recurringScan.url,
      robotsTxtFound: scanResult.robotsTxtFound,
      robotsTxtContent: scanResult.robotsTxtContent,
      llmsTxtFound: scanResult.llmsTxtFound,
      llmsTxtContent: scanResult.llmsTxtContent,
      botPermissions: scanResult.botPermissions,
      errors: scanResult.errors,
      warnings: scanResult.warnings,
    });

    // Check for changes if there was a previous scan
    if (recurringScan.lastScanId) {
      const previousScan = await storage.getScan(recurringScan.lastScanId);
      if (previousScan) {
        const changeDetection = detectChanges(previousScan, newScan);

        if (changeDetection.hasChanges) {
          // Get notification preferences
          const prefs = await storage.getNotificationPreferenceByRecurringScanId(recurringScanId);
          
          if (prefs) {
            // Create notifications based on preferences
            if (changeDetection.changes.robotsTxtChanged && prefs.notifyOnRobotsTxtChange) {
              await storage.createNotification({
                userId: recurringScan.userId,
                recurringScanId: recurringScanId,
                scanId: newScan.id,
                type: 'robots_txt_change',
                title: 'robots.txt Changed',
                message: `Changes detected in robots.txt for ${recurringScan.url}`,
                changes: { robotsTxtChanged: true } as Record<string, any>,
                isRead: false,
              });
            }

            if (changeDetection.changes.llmsTxtChanged && prefs.notifyOnLlmsTxtChange) {
              await storage.createNotification({
                userId: recurringScan.userId,
                recurringScanId: recurringScanId,
                scanId: newScan.id,
                type: 'llms_txt_change',
                title: 'llms.txt Changed',
                message: `Changes detected in llms.txt for ${recurringScan.url}`,
                changes: { llmsTxtChanged: true } as Record<string, any>,
                isRead: false,
              });
            }

            if (changeDetection.changes.botPermissionsChanged && prefs.notifyOnBotPermissionChange) {
              const changedBots = Object.keys(changeDetection.changes.botPermissionsChanged);
              await storage.createNotification({
                userId: recurringScan.userId,
                recurringScanId: recurringScanId,
                scanId: newScan.id,
                type: 'bot_permission_change',
                title: 'Bot Permissions Changed',
                message: `Bot permission changes detected for ${changedBots.length} bot(s) on ${recurringScan.url}`,
                changes: changeDetection.changes.botPermissionsChanged as Record<string, any>,
                isRead: false,
              });
            }

            if (changeDetection.changes.newErrors && prefs.notifyOnNewErrors) {
              await storage.createNotification({
                userId: recurringScan.userId,
                recurringScanId: recurringScanId,
                scanId: newScan.id,
                type: 'new_errors',
                title: 'New Errors Detected',
                message: `${changeDetection.changes.newErrors.length} new error(s) detected on ${recurringScan.url}`,
                changes: { newErrors: changeDetection.changes.newErrors } as Record<string, any>,
                isRead: false,
              });
            }
          }
        }
      }
    }

    // Update recurring scan with next run time
    await storage.updateRecurringScan(recurringScanId, {
      lastScanId: newScan.id,
      lastRunAt: new Date(),
      nextRunAt: calculateNextRun(recurringScan.frequency),
    });

    console.log(`[Scheduler] Completed recurring scan #${recurringScanId}`);
  } catch (error) {
    console.error(`[Scheduler] Error processing recurring scan #${recurringScanId}:`, error);
  }
}

// Main scheduler function - runs every minute
export async function runScheduler() {
  try {
    const dueScans = await storage.getDueRecurringScans();
    
    if (dueScans.length > 0) {
      console.log(`[Scheduler] Found ${dueScans.length} due scan(s)`);
      
      // Limit concurrency to 5 scans at a time
      const limit = pLimit(5);
      const tasks = dueScans.map(scan => 
        limit(() => processRecurringScan(scan.id))
      );
      await Promise.all(tasks);
    }
  } catch (error) {
    console.error('[Scheduler] Error running scheduler:', error);
  }
}

// Start the scheduler with a 1-minute interval
export function startScheduler() {
  console.log('[Scheduler] Starting recurring scan scheduler...');
  
  // Run immediately on startup
  runScheduler();
  
  // Then run every minute
  setInterval(runScheduler, 60 * 1000);
}
