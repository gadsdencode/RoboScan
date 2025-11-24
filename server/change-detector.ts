import type { Scan } from "@shared/schema";

export interface ChangeDetectionResult {
  hasChanges: boolean;
  changes: {
    robotsTxtChanged?: boolean;
    llmsTxtChanged?: boolean;
    botPermissionsChanged?: Record<string, { old: string; new: string }>;
    newErrors?: string[];
  };
}

// Helper to normalize content for comparison (ignore whitespace/newlines)
function normalize(content: string | null): string {
  return (content || '').trim().replace(/\r\n/g, '\n');
}

export function detectChanges(previousScan: Scan, newScan: Scan): ChangeDetectionResult {
  const changes: ChangeDetectionResult['changes'] = {};
  let hasChanges = false;

  // Check robots.txt changes (Normalized)
  if (normalize(previousScan.robotsTxtContent) !== normalize(newScan.robotsTxtContent)) {
    changes.robotsTxtChanged = true;
    hasChanges = true;
  }

  // Check llms.txt changes (Normalized)
  if (normalize(previousScan.llmsTxtContent) !== normalize(newScan.llmsTxtContent)) {
    changes.llmsTxtChanged = true;
    hasChanges = true;
  }

  // Check bot permissions changes
  const oldPermissions = (previousScan.botPermissions as Record<string, string>) || {};
  const newPermissions = (newScan.botPermissions as Record<string, string>) || {};
  
  const botPermissionChanges: Record<string, { old: string; new: string }> = {};
  
  const allBots = new Set([...Object.keys(oldPermissions), ...Object.keys(newPermissions)]);

  allBots.forEach(bot => {
    const oldPerm = oldPermissions[bot];
    const newPerm = newPermissions[bot];

    // Only register if there is an actual difference in value
    if (oldPerm !== newPerm) {
      // If both are falsy (null/undefined/empty), skip
      if (!oldPerm && !newPerm) return;

      botPermissionChanges[bot] = {
        old: oldPerm || 'Not set',
        new: newPerm || 'Removed'
      };
      hasChanges = true;
    }
  });

  if (Object.keys(botPermissionChanges).length > 0) {
    changes.botPermissionsChanged = botPermissionChanges;
  }

  // Check for new errors
  const oldErrors = (previousScan.errors as string[]) || [];
  const newErrors = (newScan.errors as string[]) || [];
  
  // Find strictly NEW errors
  const addedErrors = newErrors.filter(err => !oldErrors.includes(err));
  
  if (addedErrors.length > 0) {
    changes.newErrors = addedErrors;
    hasChanges = true;
  }

  return { hasChanges, changes };
}
