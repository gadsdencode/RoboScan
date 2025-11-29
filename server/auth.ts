import type { Express, RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { storage } from "./storage.js";
import cookieParser from "cookie-parser";

const JWT_SECRET = process.env.SESSION_SECRET || process.env.NEXTAUTH_SECRET || "dev-secret-change-me";
const COOKIE_NAME = "auth_token";
const TOKEN_EXPIRY = "7d";

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
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

// Verify and decode a JWT token
function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
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

export async function setupAuth(app: Express) {
  app.use(cookieParser());

  // Simple email login - creates or gets user
  app.post("/api/auth/login", async (req, res) => {
    // Ensure response is always sent, even if error occurs
    let responseSent = false;
    const sendError = (status: number, message: string, error?: any): void => {
      if (!responseSent && !res.headersSent) {
        responseSent = true;
        console.error(`[Auth] Login error (${status}):`, message, error);
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
      const { email } = req.body;
      
      if (!email || typeof email !== "string") {
        sendError(400, "Email is required");
        return;
      }

      const normalizedEmail = email.toLowerCase().trim();
      
      console.log(`[Auth] Attempting login for: ${normalizedEmail}`);
      
      // Get or create user
      let user: any;
      try {
        user = await storage.getUser(normalizedEmail);
        console.log(`[Auth] getUser result:`, user ? "found" : "not found");
      } catch (dbError) {
        console.error("[Auth] Database error in getUser:", dbError);
        sendError(500, "Database connection failed", dbError);
        return;
      }
      
      if (!user) {
        try {
          console.log(`[Auth] Creating new user: ${normalizedEmail}`);
          user = await storage.upsertUser({
            id: normalizedEmail,
            email: normalizedEmail,
            firstName: null,
            lastName: null,
            profileImageUrl: null,
          });
          console.log(`[Auth] User created successfully`);
        } catch (dbError) {
          console.error("[Auth] Database error in upsertUser:", dbError);
          sendError(500, "Failed to create user account", dbError);
          return;
        }
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
            }
          });
        } catch (sendErr) {
          console.error("[Auth] Failed to send success response:", sendErr);
        }
      }
    } catch (error) {
      console.error("[Auth] Unexpected login error:", error);
      sendError(500, "Login failed", error);
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

      res.json(user);
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
