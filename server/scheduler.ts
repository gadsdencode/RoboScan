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
            // 1. Detailed Robots.txt Message
            if (changeDetection.changes.robotsTxtChanged && prefs.notifyOnRobotsTxtChange) {
              const oldSize = previousScan.robotsTxtContent?.length || 0;
              const newSize = newScan.robotsTxtContent?.length || 0;
              const diff = newSize - oldSize;
              const sizeMsg = diff > 0 ? `(+${diff} chars)` : `(${diff} chars)`;
              
              await storage.createNotification({
                userId: recurringScan.userId,
                recurringScanId: recurringScanId,
                scanId: newScan.id,
                type: 'robots_txt_change',
                title: 'robots.txt Updated',
                message: `robots.txt content changed ${sizeMsg} for ${recurringScan.url}`,
                changes: { robotsTxtChanged: true, diff: diff } as Record<string, any>,
                isRead: false,
              });
            }

            // 2. Detailed LLMs.txt Message
            if (changeDetection.changes.llmsTxtChanged && prefs.notifyOnLlmsTxtChange) {
              const exists = newScan.llmsTxtFound ? "found" : "removed";
              await storage.createNotification({
                userId: recurringScan.userId,
                recurringScanId: recurringScanId,
                scanId: newScan.id,
                type: 'llms_txt_change',
                title: 'llms.txt Update',
                message: `llms.txt is now ${exists} or modified on ${recurringScan.url}`,
                changes: { llmsTxtChanged: true } as Record<string, any>,
                isRead: false,
              });
            }

            // 3. Detailed Bot Permissions Message (The most important one)
            if (changeDetection.changes.botPermissionsChanged && prefs.notifyOnBotPermissionChange) {
              const changes = changeDetection.changes.botPermissionsChanged;
              const botNames = Object.keys(changes);
              
              // Construct a readable summary: "GPTBot: Allowed -> Blocked"
              const summary = botNames.slice(0, 2).map(bot => 
                `${bot}: ${changes[bot].old} → ${changes[bot].new}`
              ).join(', ');
              
              const extra = botNames.length > 2 ? ` (+${botNames.length - 2} more)` : '';

              await storage.createNotification({
                userId: recurringScan.userId,
                recurringScanId: recurringScanId,
                scanId: newScan.id,
                type: 'bot_permission_change',
                title: 'Bot Permissions Changed',
                message: `${summary}${extra} on ${recurringScan.url}`,
                changes: changes as Record<string, any>,
                isRead: false,
              });
            }

            // 4. Detailed Error Message
            if (changeDetection.changes.newErrors && prefs.notifyOnNewErrors) {
              const errors = changeDetection.changes.newErrors;
              const firstError = errors[0];
              const extra = errors.length > 1 ? ` (and ${errors.length - 1} others)` : '';

              await storage.createNotification({
                userId: recurringScan.userId,
                recurringScanId: recurringScanId,
                scanId: newScan.id,
                type: 'new_errors',
                title: 'New Errors Detected',
                message: `Error: "${firstError}"${extra} detected on ${recurringScan.url}`,
                changes: { newErrors: errors } as Record<string, any>,
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
