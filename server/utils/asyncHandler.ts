// server/utils/asyncHandler.ts
// Wraps async route handlers so rejected promises are passed to Express error middleware

import type { NextFunction, Request, Response } from "express";

export const asyncHandler =
  (fn: Function) => (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next);
