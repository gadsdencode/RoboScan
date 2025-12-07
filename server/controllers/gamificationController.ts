// server/controllers/gamificationController.ts
// Handles gamification and achievements routes

import { Router, Response } from "express";
import { storage } from "../storage.js";
import { isAuthenticated } from "../auth.js";

const router = Router();

/**
 * GET /api/user/achievements
 * Get all unlocked achievements for authenticated user
 */
router.get('/achievements', isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.user.claims.sub;
    const unlocked = await storage.getUserAchievements(userId);
    res.json(unlocked);
  } catch (error) {
    console.error("Error fetching achievements:", error);
    res.status(500).json({ message: "Failed to fetch achievements" });
  }
});

export default router;
