// server/middleware/rateLimiter.ts
// Per-IP rate limiting for auth and general API routes

import rateLimit, { type Options } from "express-rate-limit";
import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError.js";

/**
 * Default MemoryStore is process-local. For production deployments with multiple
 * instances (e.g., Vercel serverless cold starts / horizontal scaling), replace
 * with a Redis-backed store (e.g., `rate-limit-redis`) so limits are enforced
 * consistently across instances.
 */

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

function skipInTestEnv(): boolean {
  return process.env.NODE_ENV === "test";
}

function rateLimitExceededHandler(
  _req: Request,
  res: Response,
  _next: NextFunction,
  _optionsUsed: Options
): void {
  const err = AppError.rateLimited();
  res.status(err.statusCode).json({
    message: err.message,
    code: err.code,
  });
}

/**
 * Stricter limit for login, registration, and password-setting endpoints.
 * 5 requests per 15-minute window per IP.
 */
export const authRateLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES_MS,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTestEnv,
  handler: rateLimitExceededHandler,
});

/**
 * General API rate limit: 100 requests per 15-minute window per IP.
 */
export const apiRateLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES_MS,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTestEnv,
  handler: rateLimitExceededHandler,
});

export default authRateLimiter;
