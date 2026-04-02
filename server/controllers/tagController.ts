// server/controllers/tagController.ts
// Handles tag management routes for user scans

import { Router, Response } from "express";
import { AppError } from "../errors/AppError.js";
import { storage } from "../storage.js";
import { isAuthenticated } from "../auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

/**
 * GET /api/user/tags
 * Get all unique tags used by the authenticated user
 */
router.get(
  "/tags",
  isAuthenticated,
  asyncHandler(async (req: any, res: Response) => {
    const userId = req.user.claims.sub;
    const tags = await storage.getAllUserTags(userId).catch(() => {
      throw new AppError("Failed to get tags", 500);
    });
    res.json(tags);
  })
);

export default router;
