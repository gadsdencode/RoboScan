// server/controllers/buildersValidationController.ts
// POST /api/builders/validate — server validation + one-time XP for non-llms builders

import { Router, Response } from "express";
import { z } from "zod";
import { isAuthenticated } from "../auth.js";
import { validateBuilderFileContent } from "../utils/builderFileValidation.js";
import {
  awardBuilderValidationXpIfUnique,
} from "../services/gamificationService.js";

const router = Router();

const bodySchema = z.object({
  builderKey: z.enum(["robots", "sitemap", "manifest", "security", "humans", "ads", "ai"]),
  content: z.string().max(600_000),
});

/**
 * POST /api/builders/validate
 * Validates file content and may award one-time builder validation XP (5 base, 2× for subscribers).
 */
router.post("/builders/validate", isAuthenticated, async (req: any, res: Response) => {
  try {
    const { builderKey, content } = bodySchema.parse(req.body);
    const userId = req.user.claims.sub;

    const { isValid, errors } = validateBuilderFileContent(builderKey, content);

    if (!isValid) {
      return res.json({ isValid: false, errors, gamification: null });
    }

    const gamification = await awardBuilderValidationXpIfUnique(userId, builderKey);

    return res.json({
      isValid: true,
      errors: [],
      gamification,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid request", errors: error.errors });
    }
    console.error("[builders/validate]", error);
    return res.status(500).json({ message: "Validation failed" });
  }
});

export default router;
