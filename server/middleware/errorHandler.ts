// server/middleware/errorHandler.ts
// Centralized Express error-handling middleware (must be registered after routes)

import type { NextFunction, Request, Response } from "express";
import Stripe from "stripe";
import { ZodError } from "zod";
import { AppError } from "../errors/AppError.js";

const isDev = () => process.env.NODE_ENV === "development";

function logError(err: unknown): void {
  console.error(err);
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  logError(err);

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      message: err.message,
      ...(err.code != null && { code: err.code }),
      ...(isDev() && { stack: err.stack }),
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      message: "Validation error",
      code: "VALIDATION_ERROR",
      errors: err.errors,
    });
    return;
  }

  if (err instanceof Stripe.errors.StripeError) {
    const status = err.statusCode ?? 500;
    const message =
      isDev() || status < 500
        ? err.message
        : "Something went wrong processing your payment";
    res.status(status).json({
      message,
      ...(isDev() && { type: err.type, code: err.code }),
    });
    return;
  }

  const message =
    err instanceof Error ? err.message : "Internal Server Error";

  res.status(500).json({
    message: isDev() ? message : "Internal server error",
    ...(isDev() && err instanceof Error && { stack: err.stack }),
  });
}
