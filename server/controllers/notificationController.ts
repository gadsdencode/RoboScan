// server/controllers/notificationController.ts
// Handles user notification routes

import { Router, Response } from "express";
import { storage } from "../storage.js";
import { isAuthenticated } from "../auth.js";
import { parsePositiveInt, parseNonNegativeInt } from "../utils/validation.js";

const router = Router();

/**
 * GET /api/notifications
 * Get notifications for authenticated user with pagination
 */
router.get('/', isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.user.claims.sub;
    const limit = parsePositiveInt(req.query.limit, 50, 1, 100);
    const offset = parseNonNegativeInt(req.query.offset, 0);
    const notifications = await storage.getUserNotifications(userId, limit, offset);
    res.json(notifications);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: "Failed to get notifications" });
  }
});

/**
 * GET /api/notifications/unread-count
 * Get count of unread notifications
 */
router.get('/unread-count', isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.user.claims.sub;
    const count = await storage.getUnreadNotificationCount(userId);
    res.json({ count });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ message: "Failed to get unread count" });
  }
});

/**
 * PATCH /api/notifications/:id/read
 * Mark a single notification as read
 */
router.patch('/:id/read', isAuthenticated, async (req: any, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await storage.markNotificationAsRead(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ message: "Failed to mark notification as read" });
  }
});

/**
 * POST /api/notifications/mark-all-read
 * Mark all notifications as read for authenticated user
 */
router.post('/mark-all-read', isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.user.claims.sub;
    await storage.markAllNotificationsAsRead(userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({ message: "Failed to mark all as read" });
  }
});

export default router;
