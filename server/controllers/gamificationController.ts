// server/controllers/gamificationController.ts
// Handles gamification and achievements routes

import { Router, Response } from "express";
import { AppError } from "../errors/AppError.js";
import { storage } from "../storage.js";
import { ACHIEVEMENTS } from "../gamification.js";
import { getAchievementProgressForUser } from "../services/gamificationService.js";
import { isAuthenticated } from "../auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

/**
 * GET /api/user/achievements
 * Unlocked rows + progress hints for locked achievements + total defined count
 */
router.get(
  "/achievements",
  isAuthenticated,
  asyncHandler(async (req: any, res: Response) => {
    const userId = req.user.claims.sub;
    const [unlocked, progress] = await Promise.all([
      storage.getUserAchievements(userId).catch(() => {
        throw new AppError("Failed to fetch achievements", 500);
      }),
      getAchievementProgressForUser(userId).catch(() => {
        throw new AppError("Failed to fetch achievement progress", 500);
      }),
    ]);
    res.json({
      unlocked,
      progress,
      totalDefined: Object.keys(ACHIEVEMENTS).length,
    });
  })
);

export default router;
