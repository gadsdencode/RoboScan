// server/controllers/tagController.ts
// Handles tag management routes for user scans

import { Router, Response } from "express";
import { storage } from "../storage.js";
import { isAuthenticated } from "../auth.js";

const router = Router();

/**
 * GET /api/user/tags
 * Get all unique tags used by the authenticated user
 */
router.get('/', isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.user.claims.sub;
    const tags = await storage.getAllUserTags(userId);
    res.json(tags);
  } catch (error) {
    console.error('Get tags error:', error);
    res.status(500).json({ message: "Failed to get tags" });
  }
});

export default router;
