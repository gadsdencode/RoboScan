// server/controllers/recurringScansController.ts
// Handles recurring scan management and notification preferences
// NOTE: Recurring scans are a SUBSCRIPTION-ONLY feature (Guardian tier)

import { Router, Response } from "express";
import { z } from "zod";
import { storage } from "../storage.js";
import { isAuthenticated } from "../auth.js";
import { requireSubscription } from "../utils/accessControl.js";
import { isAdmin } from "../utils/admin.js";
import {
  recurringScanCreateSchema,
  recurringScanUpdateSchema,
  notificationPreferencesUpdateSchema,
} from "../utils/validation.js";

const router = Router();

/**
 * POST /api/recurring-scans
 * Create a new recurring scan
 * SUBSCRIPTION REQUIRED: This is a Guardian-tier feature
 */
router.post('/', isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.user.claims.sub;
    
    // Check subscription access (admins bypass this check)
    if (!isAdmin(req)) {
      const hasAccess = await storage.hasRecurringScanAccess(userId);
      if (!hasAccess) {
        return res.status(403).json({
          message: "Recurring scans require an active Guardian subscription",
          requiresSubscription: true,
          feature: 'recurring_scans',
        });
      }
    }
    
    const { url, frequency, notificationPreferences } = recurringScanCreateSchema.parse(req.body);

    const nextRunAt = new Date(Date.now() + 60 * 1000); // First run in 1 minute

    const recurringScan = await storage.createRecurringScan({
      userId,
      url,
      frequency,
      isActive: true,
      nextRunAt,
    });

    // Create notification preferences
    await storage.createNotificationPreference({
      recurringScanId: recurringScan.id,
      notifyOnRobotsTxtChange: notificationPreferences?.notifyOnRobotsTxtChange ?? true,
      notifyOnLlmsTxtChange: notificationPreferences?.notifyOnLlmsTxtChange ?? true,
      notifyOnBotPermissionChange: notificationPreferences?.notifyOnBotPermissionChange ?? true,
      notifyOnNewErrors: notificationPreferences?.notifyOnNewErrors ?? true,
      notificationMethod: notificationPreferences?.notificationMethod ?? 'in-app',
    });

    res.json(recurringScan);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid request", errors: error.errors });
    }
    console.error('Create recurring scan error:', error);
    res.status(500).json({ message: "Failed to create recurring scan" });
  }
});

/**
 * GET /api/recurring-scans
 * Get all recurring scans for authenticated user
 */
router.get('/', isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.user.claims.sub;
    const scans = await storage.getUserRecurringScans(userId);
    res.json(scans);
  } catch (error) {
    console.error('Get recurring scans error:', error);
    res.status(500).json({ message: "Failed to get recurring scans" });
  }
});

/**
 * PATCH /api/recurring-scans/:id
 * Update a recurring scan
 */
router.patch('/:id', isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.user.claims.sub;
    const id = parseInt(req.params.id);
    
    const recurringScan = await storage.getRecurringScan(id);
    if (!recurringScan || recurringScan.userId !== userId) {
      return res.status(404).json({ message: "Recurring scan not found" });
    }

    const { isActive, frequency } = recurringScanUpdateSchema.parse(req.body);

    // Only include defined fields
    const updates: any = {};
    if (isActive !== undefined) updates.isActive = isActive;
    if (frequency !== undefined) updates.frequency = frequency;

    const updated = await storage.updateRecurringScan(id, updates);

    res.json(updated);
  } catch (error) {
    console.error('Update recurring scan error:', error);
    res.status(500).json({ message: "Failed to update recurring scan" });
  }
});

/**
 * DELETE /api/recurring-scans/:id
 * Delete a recurring scan
 */
router.delete('/:id', isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.user.claims.sub;
    const id = parseInt(req.params.id);
    
    const recurringScan = await storage.getRecurringScan(id);
    if (!recurringScan || recurringScan.userId !== userId) {
      return res.status(404).json({ message: "Recurring scan not found" });
    }

    await storage.deleteRecurringScan(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete recurring scan error:', error);
    res.status(500).json({ message: "Failed to delete recurring scan" });
  }
});

/**
 * GET /api/recurring-scans/:id/preferences
 * Get notification preferences for a recurring scan
 */
router.get('/:id/preferences', isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.user.claims.sub;
    const id = parseInt(req.params.id);
    
    const recurringScan = await storage.getRecurringScan(id);
    if (!recurringScan) {
      return res.status(404).json({ message: "Recurring scan not found" });
    }

    // Security: Verify ownership
    if (recurringScan.userId !== userId) {
      return res.status(403).json({ message: "Access denied" });
    }

    const prefs = await storage.getNotificationPreferenceByRecurringScanId(id);
    res.json(prefs);
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({ message: "Failed to get preferences" });
  }
});

/**
 * PATCH /api/recurring-scans/:id/preferences
 * Update notification preferences for a recurring scan
 */
router.patch('/:id/preferences', isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.user.claims.sub;
    const id = parseInt(req.params.id);
    
    const recurringScan = await storage.getRecurringScan(id);
    if (!recurringScan) {
      return res.status(404).json({ message: "Recurring scan not found" });
    }

    // Security: Verify ownership
    if (recurringScan.userId !== userId) {
      return res.status(403).json({ message: "Access denied" });
    }

    const prefs = await storage.getNotificationPreferenceByRecurringScanId(id);
    if (!prefs) {
      return res.status(404).json({ message: "Preferences not found" });
    }

    const parsed = notificationPreferencesUpdateSchema.parse(req.body);

    // Only include defined fields
    const updates: any = {};
    if (parsed.notifyOnRobotsTxtChange !== undefined) updates.notifyOnRobotsTxtChange = parsed.notifyOnRobotsTxtChange;
    if (parsed.notifyOnLlmsTxtChange !== undefined) updates.notifyOnLlmsTxtChange = parsed.notifyOnLlmsTxtChange;
    if (parsed.notifyOnBotPermissionChange !== undefined) updates.notifyOnBotPermissionChange = parsed.notifyOnBotPermissionChange;
    if (parsed.notifyOnNewErrors !== undefined) updates.notifyOnNewErrors = parsed.notifyOnNewErrors;
    if (parsed.notificationMethod !== undefined) updates.notificationMethod = parsed.notificationMethod;

    const updated = await storage.updateNotificationPreference(prefs.id, updates);
    res.json(updated);
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ message: "Failed to update preferences" });
  }
});

export default router;
