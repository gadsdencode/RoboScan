// server/controllers/gamificationController.ts
// Handles gamification and achievements routes

import { Router, Response } from "express";
import { AppError } from "../errors/AppError.js";
import { storage } from "../storage.js";
import { isAuthenticated } from "../auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

/**
 * GET /api/user/achievements
 * Get all unlocked achievements for authenticated user
 */
router.get(
  "/achievements",
  isAuthenticated,
  asyncHandler(async (req: any, res: Response) => {
    const userId = req.user.claims.sub;
    const unlocked = await storage.getUserAchievements(userId).catch(() => {
      throw new AppError("Failed to fetch achievements", 500);
    });
    res.json(unlocked);
  })
);

export default router;
