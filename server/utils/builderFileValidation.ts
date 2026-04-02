// server/utils/builderFileValidation.ts
// Minimal server-side validation for builder “validate” actions (matches client rules loosely).

import type { BuilderValidationKey } from "../../shared/gamification.js";

export interface BuilderValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validates generated builder file content for the given builder key.
 */
export function validateBuilderFileContent(
  builderKey: Exclude<BuilderValidationKey, "llms">,
  content: string
): BuilderValidationResult {
  const errors: string[] = [];
  const trimmed = content.trim();

  if (!trimmed) {
    errors.push("Content is empty");
    return { isValid: false, errors };
  }

  if (trimmed.length > 500_000) {
    errors.push("File size exceeds 500KB limit");
  }

  switch (builderKey) {
    case "robots": {
      const lines = trimmed.split("\n");
      lines.forEach((line, index) => {
        const t = line.trim();
        if (t && !t.startsWith("#") && !t.includes(":")) {
          errors.push(`Line ${index + 1}: Invalid syntax — expected ':' in rule lines`);
        }
      });
      break;
    }
    case "sitemap": {
      const lower = trimmed.toLowerCase();
      if (!lower.includes("<?xml") && !lower.includes("<urlset") && !lower.includes("<url>")) {
        errors.push("Does not look like a valid XML sitemap");
      }
      break;
    }
    case "manifest": {
      try {
        JSON.parse(trimmed);
      } catch {
        errors.push("Invalid JSON");
      }
      break;
    }
    case "security": {
      if (!/contact\s*:/i.test(trimmed)) {
        errors.push("Expected a Contact: field (security.txt convention)");
      }
      break;
    }
    case "humans":
    case "ads":
    case "ai": {
      if (trimmed.length < 10) {
        errors.push("Content is too short");
      }
      break;
    }
  }

  return { isValid: errors.length === 0, errors };
}
