// server/controllers/toolsController.ts
// Handles utility tools like bot access testing

import { Router, Response } from "express";
import { z } from "zod";
import { getBotUserAgent } from "../../shared/bot-user-agents.js";
import { testBotAccessSchema } from "../utils/validation.js";

const router = Router();

/**
 * POST /api/test-bot-access
 * Test if a URL is accessible by a specific bot's user agent
 */
router.post('/test-bot-access', async (req: any, res: Response) => {
  try {
    const { url, botName } = testBotAccessSchema.parse(req.body);

    const botUserAgent = getBotUserAgent(botName);

    try {
      const response = await fetch(url, {
        method: 'HEAD',
        headers: {
          'User-Agent': botUserAgent,
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(10000),
      });

      res.json({
        status: response.status,
        accessible: response.ok,
        statusText: response.statusText,
      });
    } catch (fetchError) {
      console.error('Bot access test error:', fetchError);
      res.json({
        status: 0,
        accessible: false,
        statusText: "Connection failed",
        error: fetchError instanceof Error ? fetchError.message : "Unknown error",
      });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: "Invalid request",
        errors: error.errors,
      });
    }

    console.error('Test bot access error:', error);
    res.status(500).json({
      message: "Failed to test bot access",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
