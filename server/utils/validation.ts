// server/utils/validation.ts
// Shared validation schemas and parsing utilities

import { z } from "zod";

// ============== Request Schemas ==============

export const scanRequestSchema = z.object({
  url: z.string().min(1, "URL is required"),
  tags: z.array(z.string()).optional(),
});

export const createPaymentSchema = z.object({
  scanId: z.number(),
});

export const paymentIntentIdSchema = z.object({
  paymentIntentId: z.string(),
});

export const fieldKeySchema = z.object({
  fieldKey: z.string().min(1, "Field key is required"),
});

export const testBotAccessSchema = z.object({
  url: z.string().url("Invalid URL"),
  botName: z.string().min(1, "Bot name is required"),
});

export const validateLlmsTxtSchema = z.object({
  content: z.string().min(1, "Content is required"),
});

export const tagsSchema = z.object({
  tags: z.array(z.string()).default([]),
});

export const recurringScanCreateSchema = z.object({
  url: z.string().min(1),
  frequency: z.enum(['daily', 'weekly', 'monthly']),
  notificationPreferences: z.object({
    notifyOnRobotsTxtChange: z.boolean().default(true),
    notifyOnLlmsTxtChange: z.boolean().default(true),
    notifyOnBotPermissionChange: z.boolean().default(true),
    notifyOnNewErrors: z.boolean().default(true),
    notificationMethod: z.enum(['in-app', 'email', 'both']).default('in-app'),
  }).optional(),
});

export const recurringScanUpdateSchema = z.object({
  isActive: z.boolean().optional(),
  frequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
});

export const notificationPreferencesUpdateSchema = z.object({
  notifyOnRobotsTxtChange: z.boolean().optional(),
  notifyOnLlmsTxtChange: z.boolean().optional(),
  notifyOnBotPermissionChange: z.boolean().optional(),
  notifyOnNewErrors: z.boolean().optional(),
  notificationMethod: z.enum(['in-app', 'email', 'both']).optional(),
});

// ============== Parsing Utilities ==============

export function parsePositiveInt(value: any, defaultValue: number, min: number = 1, max: number = 100): number {
  const parsed = parseInt(value);
  if (isNaN(parsed) || parsed < min) return defaultValue;
  return Math.min(parsed, max);
}

export function parseNonNegativeInt(value: any, defaultValue: number): number {
  const parsed = parseInt(value);
  if (isNaN(parsed) || parsed < 0) return defaultValue;
  return parsed;
}
