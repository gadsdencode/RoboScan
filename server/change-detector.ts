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

export function detectChanges(previousScan: Scan, newScan: Scan): ChangeDetectionResult {
  const changes: ChangeDetectionResult['changes'] = {};
  let hasChanges = false;

  // Check robots.txt changes
  if (previousScan.robotsTxtContent !== newScan.robotsTxtContent) {
    changes.robotsTxtChanged = true;
    hasChanges = true;
  }

  // Check llms.txt changes
  if (previousScan.llmsTxtContent !== newScan.llmsTxtContent) {
    changes.llmsTxtChanged = true;
    hasChanges = true;
  }

  // Check bot permissions changes
  const oldPermissions = (previousScan.botPermissions as Record<string, string>) || {};
  const newPermissions = (newScan.botPermissions as Record<string, string>) || {};
  
  const botPermissionChanges: Record<string, { old: string; new: string }> = {};
  
  // Check for changed or new bot permissions
  Object.keys(newPermissions).forEach(bot => {
    if (oldPermissions[bot] !== newPermissions[bot]) {
      botPermissionChanges[bot] = {
        old: oldPermissions[bot] || 'Not found',
        new: newPermissions[bot]
      };
      hasChanges = true;
    }
  });
  
  // Check for removed bot permissions
  Object.keys(oldPermissions).forEach(bot => {
    if (!(bot in newPermissions)) {
      botPermissionChanges[bot] = {
        old: oldPermissions[bot],
        new: 'Removed'
      };
      hasChanges = true;
    }
  });

  if (Object.keys(botPermissionChanges).length > 0) {
    changes.botPermissionsChanged = botPermissionChanges;
  }

  // Check for new errors
  const oldErrors = previousScan.errors || [];
  const newErrors = newScan.errors || [];
  const addedErrors = newErrors.filter(err => !oldErrors.includes(err));
  
  if (addedErrors.length > 0) {
    changes.newErrors = addedErrors;
    hasChanges = true;
  }

  return { hasChanges, changes };
}
