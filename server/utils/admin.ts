// server/utils/admin.ts
// Admin authentication utilities

import { checkAuthentication } from "../auth.js";

// Admin emails from environment variables (comma-separated)
// Example: ADMIN_EMAILS="investor@example.com,me@roboscan.com"
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map(e => e.trim().toLowerCase())
  .filter(e => e.length > 0);

/**
 * Check if the current request user is an admin.
 * @param req Express request object with user info from auth middleware
 */
export function isAdmin(req: any): boolean {
  if (!checkAuthentication(req) || !req.user?.claims?.email) {
    return false;
  }
  return ADMIN_EMAILS.includes(req.user.claims.email.toLowerCase());
}
