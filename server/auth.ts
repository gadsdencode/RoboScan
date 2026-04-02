import type { Express, RequestHandler } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { storage } from "./storage.js";
import cookieParser from "cookie-parser";
import { authRateLimiter } from "./middleware/rateLimiter.js";

/** Set in setupAuth() after validating JWT_SECRET (no module-load fallback). */
let jwtSigningSecret: string | undefined;

const COOKIE_NAME = "auth_token";
/** Explicit JWT lifetime — never infinite. */
const TOKEN_EXPIRY = "7d" as const;

function getJwtSigningSecret(): string {
  if (!jwtSigningSecret || jwtSigningSecret.length < 32) {
    throw new Error(
      "FATAL: JWT_SECRET must be set and at least 32 characters long"
    );
  }
  return jwtSigningSecret;
}

// Detect production environment (Vercel always uses HTTPS)
const isProduction = process.env.NODE_ENV === "production" || !!process.env.VERCEL;

interface JWTPayload {
  userId: string;
  email: string;
  name?: string;
  iat?: number;
  exp?: number;
}

// Create a signed JWT token
function createToken(payload: Omit<JWTPayload, "iat" | "exp">): string {
  return jwt.sign(payload, getJwtSigningSecret(), {
    expiresIn: TOKEN_EXPIRY,
  });
}

// Verify and decode a JWT token
function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, getJwtSigningSecret()) as unknown as JWTPayload;
  } catch {
    return null;
  }
}

// Set auth cookie with proper attributes for Vercel deployment
// Vercel serves both frontend and API on the same domain, so sameSite: "lax" works perfectly
function setAuthCookie(res: any, token: string) {
  const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true, // Prevents XSS attacks by blocking JavaScript access
    secure: isProduction, // Always true on Vercel (HTTPS required)
    sameSite: "lax", // Secure for same-site navigation, works with Vercel's same-domain setup
    maxAge,
    path: "/", // Available across entire site
    // Note: Don't set 'domain' - let the browser infer it from the request (required for Vercel)
  });
}

// Clear auth cookie with matching attributes (must match setAuthCookie options exactly)
function clearAuthCookie(res: any) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    // Note: maxAge not needed for clearing, but other options must match
  });
}

// Password hashing utilities
const SALT_ROUNDS = 12;

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Password validation
function validatePassword(password: string): { valid: boolean; message?: string } {
  if (!password || typeof password !== "string") {
    return { valid: false, message: "Password is required" };
  }
  if (password.length < 8) {
    return { valid: false, message: "Password must be at least 8 characters" };
  }
  return { valid: true };
}

// Email validation
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export async function setupAuth(app: Express) {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "FATAL: JWT_SECRET must be set and at least 32 characters long"
    );
  }
  jwtSigningSecret = secret;

  app.use(cookieParser());

  // Email/password login
  // NOTE: check-email endpoint was removed to prevent user enumeration attacks.
  // The login flow now uses generic error messages and handles legacy users via PASSWORD_REQUIRED code.
  app.post("/api/auth/login", authRateLimiter, async (req, res) => {
    let responseSent = false;
    const sendError = (status: number, message: string, code?: string, error?: any): void => {
      if (!responseSent && !res.headersSent) {
        responseSent = true;
        console.error(`[Auth] Login error (${status}):`, message, error);
        try {
          res.status(status).json({ 
            message,
            code,
            ...(process.env.NODE_ENV === "development" && error ? { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined } : {})
          });
        } catch (sendErr) {
          console.error("[Auth] Failed to send error response:", sendErr);
        }
      }
    };

    try {
      const { email, password } = req.body;
      
      if (!email || typeof email !== "string") {
        sendError(400, "Email is required");
        return;
      }

      if (!password || typeof password !== "string") {
        sendError(400, "Password is required");
        return;
      }

      const normalizedEmail = email.toLowerCase().trim();
      
      console.log(`[Auth] Attempting login for: ${normalizedEmail}`);
      
      // Get user
      let user: any;
      try {
        user = await storage.getUser(normalizedEmail);
        console.log(`[Auth] getUser result:`, user ? "found" : "not found");
      } catch (dbError) {
        console.error("[Auth] Database error in getUser:", dbError);
        sendError(500, "Database connection failed", undefined, dbError);
        return;
      }
      
      // User doesn't exist - use generic message to prevent user enumeration
      if (!user) {
        sendError(401, "Invalid email or password");
        return;
      }

      // User exists but has no password set (legacy user)
      if (!user.passwordHash) {
        sendError(403, "Please set a password for your account", "PASSWORD_REQUIRED");
        return;
      }

      // Verify password
      const passwordValid = await verifyPassword(password, user.passwordHash);
      if (!passwordValid) {
        sendError(401, "Invalid email or password");
        return;
      }

      // Create JWT token
      let token: string;
      try {
        token = createToken({
          userId: user.id,
          email: user.email || normalizedEmail,
          name: user.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : undefined,
        });
      } catch (tokenError) {
        console.error("[Auth] Token creation error:", tokenError);
        sendError(500, "Failed to create authentication token", undefined, tokenError);
        return;
      }

      // Set cookie
      try {
        setAuthCookie(res, token);
      } catch (cookieError) {
        console.error("[Auth] Cookie setting error:", cookieError);
        sendError(500, "Failed to set authentication cookie", undefined, cookieError);
        return;
      }

      if (!responseSent && !res.headersSent) {
        responseSent = true;
        try {
          res.json({ 
            success: true, 
            user: {
              id: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              passwordSetAt: user.passwordSetAt,
            }
          });
        } catch (sendErr) {
          console.error("[Auth] Failed to send success response:", sendErr);
        }
      }
    } catch (error) {
      console.error("[Auth] Unexpected login error:", error);
      sendError(500, "Login failed", undefined, error);
    }
  });

  // Register new user with email/password
  app.post("/api/auth/register", authRateLimiter, async (req, res) => {
    let responseSent = false;
    const sendError = (status: number, message: string, error?: any): void => {
      if (!responseSent && !res.headersSent) {
        responseSent = true;
        console.error(`[Auth] Registration error (${status}):`, message, error);
        try {
          res.status(status).json({ 
            message,
            ...(process.env.NODE_ENV === "development" && error ? { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined } : {})
          });
        } catch (sendErr) {
          console.error("[Auth] Failed to send error response:", sendErr);
        }
      }
    };

    try {
      const { email, password } = req.body;
      
      // Validate email
      if (!email || typeof email !== "string") {
        sendError(400, "Email is required");
        return;
      }

      if (!validateEmail(email)) {
        sendError(400, "Invalid email format");
        return;
      }

      // Validate password
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        sendError(400, passwordValidation.message || "Invalid password");
        return;
      }

      const normalizedEmail = email.toLowerCase().trim();
      
      console.log(`[Auth] Attempting registration for: ${normalizedEmail}`);
      
      // Check if user already exists
      let existingUser: any;
      try {
        existingUser = await storage.getUser(normalizedEmail);
      } catch (dbError) {
        console.error("[Auth] Database error in getUser:", dbError);
        sendError(500, "Database connection failed", dbError);
        return;
      }
      
      if (existingUser) {
        // Use generic message to prevent user enumeration
        // Don't reveal whether account exists or if password is set
        sendError(400, "Unable to create account. Please try signing in instead.");
        return;
      }

      // Hash password
      let passwordHash: string;
      try {
        passwordHash = await hashPassword(password);
      } catch (hashError) {
        console.error("[Auth] Password hashing error:", hashError);
        sendError(500, "Failed to process password", hashError);
        return;
      }

      // Create new user with password
      let user: any;
      try {
        console.log(`[Auth] Creating new user: ${normalizedEmail}`);
        user = await storage.upsertUser({
          id: normalizedEmail,
          email: normalizedEmail,
          firstName: null,
          lastName: null,
          profileImageUrl: null,
          passwordHash,
          passwordSetAt: new Date(),
        });
        console.log(`[Auth] User created successfully`);
      } catch (dbError) {
        console.error("[Auth] Database error in upsertUser:", dbError);
        sendError(500, "Failed to create user account", dbError);
        return;
      }

      if (!user) {
        sendError(500, "Failed to create user");
        return;
      }

      // Create JWT token
      let token: string;
      try {
        token = createToken({
          userId: user.id,
          email: user.email || normalizedEmail,
          name: user.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : undefined,
        });
      } catch (tokenError) {
        console.error("[Auth] Token creation error:", tokenError);
        sendError(500, "Failed to create authentication token", tokenError);
        return;
      }

      // Set cookie
      try {
        setAuthCookie(res, token);
      } catch (cookieError) {
        console.error("[Auth] Cookie setting error:", cookieError);
        sendError(500, "Failed to set authentication cookie", cookieError);
        return;
      }

      if (!responseSent && !res.headersSent) {
        responseSent = true;
        try {
          res.json({ 
            success: true, 
            user: {
              id: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              passwordSetAt: user.passwordSetAt,
            }
          });
        } catch (sendErr) {
          console.error("[Auth] Failed to send success response:", sendErr);
        }
      }
    } catch (error) {
      console.error("[Auth] Unexpected registration error:", error);
      sendError(500, "Registration failed", error);
    }
  });

  // Set password for existing users (legacy users without password)
  app.post("/api/auth/set-password", authRateLimiter, async (req, res) => {
    let responseSent = false;
    const sendError = (status: number, message: string, error?: any): void => {
      if (!responseSent && !res.headersSent) {
        responseSent = true;
        console.error(`[Auth] Set password error (${status}):`, message, error);
        try {
          res.status(status).json({ 
            message,
            ...(process.env.NODE_ENV === "development" && error ? { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined } : {})
          });
        } catch (sendErr) {
          console.error("[Auth] Failed to send error response:", sendErr);
        }
      }
    };

    try {
      const { email, password } = req.body;
      
      // Validate email
      if (!email || typeof email !== "string") {
        sendError(400, "Email is required");
        return;
      }

      // Validate password
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        sendError(400, passwordValidation.message || "Invalid password");
        return;
      }

      const normalizedEmail = email.toLowerCase().trim();
      
      console.log(`[Auth] Setting password for: ${normalizedEmail}`);
      
      // Get user
      let user: any;
      try {
        user = await storage.getUser(normalizedEmail);
      } catch (dbError) {
        console.error("[Auth] Database error in getUser:", dbError);
        sendError(500, "Database connection failed", dbError);
        return;
      }
      
      // Use generic messages to prevent user enumeration
      if (!user) {
        sendError(400, "Unable to set password. Please try signing in or registering.");
        return;
      }

      // If user already has a password, don't allow this endpoint
      if (user.passwordHash) {
        sendError(400, "Unable to set password. Please try signing in.");
        return;
      }

      // Hash password
      let passwordHash: string;
      try {
        passwordHash = await hashPassword(password);
      } catch (hashError) {
        console.error("[Auth] Password hashing error:", hashError);
        sendError(500, "Failed to process password", hashError);
        return;
      }

      // Update user with password
      try {
        user = await storage.updateUserPassword(normalizedEmail, passwordHash);
        console.log(`[Auth] Password set successfully for: ${normalizedEmail}`);
      } catch (dbError) {
        console.error("[Auth] Database error updating password:", dbError);
        sendError(500, "Failed to set password", dbError);
        return;
      }

      // Create JWT token
      let token: string;
      try {
        token = createToken({
          userId: user.id,
          email: user.email || normalizedEmail,
          name: user.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : undefined,
        });
      } catch (tokenError) {
        console.error("[Auth] Token creation error:", tokenError);
        sendError(500, "Failed to create authentication token", tokenError);
        return;
      }

      // Set cookie
      try {
        setAuthCookie(res, token);
      } catch (cookieError) {
        console.error("[Auth] Cookie setting error:", cookieError);
        sendError(500, "Failed to set authentication cookie", cookieError);
        return;
      }

      if (!responseSent && !res.headersSent) {
        responseSent = true;
        try {
          res.json({ 
            success: true, 
            user: {
              id: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              passwordSetAt: user.passwordSetAt,
            }
          });
        } catch (sendErr) {
          console.error("[Auth] Failed to send success response:", sendErr);
        }
      }
    } catch (error) {
      console.error("[Auth] Unexpected set-password error:", error);
      sendError(500, "Failed to set password", error);
    }
  });

  // Get current user from JWT
  app.get("/api/auth/user", async (req, res) => {
    try {
      const token = req.cookies?.[COOKIE_NAME];
      
      if (!token) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const payload = verifyToken(token);
      if (!payload) {
        clearAuthCookie(res);
        return res.status(401).json({ message: "Invalid token" });
      }

      const user = await storage.getUser(payload.userId);
      if (!user) {
        clearAuthCookie(res);
        return res.status(401).json({ message: "User not found" });
      }

      // Return user data without sensitive fields
      const { passwordHash, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  // Logout - clear cookie
  app.post("/api/auth/logout", (req, res) => {
    clearAuthCookie(res);
    res.json({ success: true });
  });

  // GET logout for redirects
  app.get("/api/logout", (req, res) => {
    clearAuthCookie(res);
    res.redirect("/");
  });

  // Redirect /api/login to login page
  app.get("/api/login", (req, res) => {
    res.redirect("/login");
  });
}

/**
 * Helper function to safely check if a request is authenticated
 * This can be used in routes that don't require authentication but want to check if user is logged in
 * @param req Express request object
 * @returns true if authenticated, false otherwise
 */
export function checkAuthentication(req: any): boolean {
  try {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) {
      return false;
    }

    const payload = verifyToken(token);
    if (!payload) {
      return false;
    }

    // Attach user info to request if not already set
    if (!req.user) {
      req.user = {
        claims: {
          sub: payload.userId,
          email: payload.email,
          name: payload.name,
        },
      };
    }

    return true;
  } catch (error) {
    return false;
  }
}

// Authentication middleware - verifies JWT from cookie
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  try {
    const token = req.cookies?.[COOKIE_NAME];
    
    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return res.status(401).json({ message: "Invalid token" });
    }

    // Attach user info to request
    (req as any).user = {
      claims: {
        sub: payload.userId,
        email: payload.email,
        name: payload.name,
      },
    };
    (req as any).isAuthenticated = () => true;

    return next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(401).json({ message: "Unauthorized" });
  }
};

// Alias for isAuthenticated (for semantic clarity in subscription routes)
export const requireAuth = isAuthenticated;
