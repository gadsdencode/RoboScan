// server/middleware/csrfProtection.ts
// CSRF protection middleware using Origin header verification

import { Request, Response, NextFunction } from "express";

/**
 * List of HTTP methods that don't require CSRF protection.
 * These methods are considered "safe" as they should not change state.
 */
const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

/**
 * CSRF protection middleware using Origin header verification.
 * 
 * Works in conjunction with `sameSite: "lax"` cookies:
 * - Lax cookies prevent cross-origin POST from third-party sites
 * - Origin verification adds defense-in-depth for browsers that support it
 * 
 * This approach is recommended by OWASP as a modern CSRF defense.
 * See: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
 * 
 * @param allowedOrigins - Additional allowed origins (e.g., custom domains)
 */
export function csrfProtection(allowedOrigins: string[] = []) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Safe methods don't need CSRF protection
    if (SAFE_METHODS.includes(req.method)) {
      return next();
    }

    // Skip CSRF check in development for easier testing
    if (process.env.NODE_ENV !== 'production') {
      return next();
    }

    const origin = req.headers.origin;
    const host = req.headers.host;

    // If no Origin header, check Referer as fallback
    // Some privacy extensions strip Origin header
    if (!origin) {
      const referer = req.headers.referer;
      if (referer) {
        try {
          const refererUrl = new URL(referer);
          const expectedHost = host?.split(':')[0]; // Remove port if present
          if (refererUrl.host.split(':')[0] === expectedHost) {
            return next();
          }
        } catch {
          // Invalid referer URL, continue to check
        }
      }
      
      // No Origin or Referer - could be a same-origin request from older browser
      // or a legitimate API call. Allow but log for monitoring.
      // In strict mode, you could reject here instead.
      console.warn(`[CSRF] Request without Origin/Referer to ${req.method} ${req.path}`);
      return next();
    }

    // Build list of allowed origins
    const validOrigins: string[] = [];

    // Allow requests from the same host (with HTTPS in production)
    if (host) {
      validOrigins.push(`https://${host}`);
      // Also allow without port for exact matches
      const hostWithoutPort = host.split(':')[0];
      validOrigins.push(`https://${hostWithoutPort}`);
    }

    // Add configured allowed origins (e.g., custom domain)
    if (process.env.ALLOWED_ORIGIN) {
      validOrigins.push(process.env.ALLOWED_ORIGIN);
    }

    // Add any additional allowed origins passed to middleware
    validOrigins.push(...allowedOrigins);

    // Verify Origin matches one of the allowed origins
    const isValidOrigin = validOrigins.some(allowed => {
      if (!allowed) return false;
      // Exact match
      if (origin === allowed) return true;
      // Match without trailing slash
      if (origin === allowed.replace(/\/$/, '')) return true;
      return false;
    });

    if (!isValidOrigin) {
      console.warn(`[CSRF] Blocked request from origin: ${origin} to ${req.method} ${req.path}`);
      return res.status(403).json({
        message: 'CSRF validation failed',
        code: 'CSRF_ERROR'
      });
    }

    next();
  };
}

/**
 * Strict CSRF protection that requires Origin header.
 * Use this for sensitive operations like payment or account changes.
 */
export function strictCsrfProtection(allowedOrigins: string[] = []) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Safe methods don't need CSRF protection
    if (SAFE_METHODS.includes(req.method)) {
      return next();
    }

    // Skip in development
    if (process.env.NODE_ENV !== 'production') {
      return next();
    }

    const origin = req.headers.origin;
    const host = req.headers.host;

    // Strict mode: require Origin header
    if (!origin) {
      console.warn(`[CSRF-Strict] Blocked request without Origin to ${req.method} ${req.path}`);
      return res.status(403).json({
        message: 'Origin header required',
        code: 'CSRF_ORIGIN_REQUIRED'
      });
    }

    // Build allowed origins list
    const validOrigins: string[] = [];
    
    if (host) {
      validOrigins.push(`https://${host}`);
      validOrigins.push(`https://${host.split(':')[0]}`);
    }
    
    if (process.env.ALLOWED_ORIGIN) {
      validOrigins.push(process.env.ALLOWED_ORIGIN);
    }
    
    validOrigins.push(...allowedOrigins);

    const isValidOrigin = validOrigins.some(allowed => {
      if (!allowed) return false;
      return origin === allowed || origin === allowed.replace(/\/$/, '');
    });

    if (!isValidOrigin) {
      console.warn(`[CSRF-Strict] Blocked request from origin: ${origin}`);
      return res.status(403).json({
        message: 'CSRF validation failed',
        code: 'CSRF_ERROR'
      });
    }

    next();
  };
}

export default csrfProtection;
