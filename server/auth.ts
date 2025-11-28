import type { Express, RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { storage } from "./storage";
import cookieParser from "cookie-parser";

const JWT_SECRET = process.env.SESSION_SECRET || process.env.NEXTAUTH_SECRET || "dev-secret-change-me";
const COOKIE_NAME = "auth_token";
const TOKEN_EXPIRY = "7d";

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

// Set auth cookie
function setAuthCookie(res: any, token: string) {
  const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge,
    path: "/",
  });
}

// Clear auth cookie
function clearAuthCookie(res: any) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
}

export async function setupAuth(app: Express) {
  app.use(cookieParser());

  // Simple email login - creates or gets user
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email || typeof email !== "string") {
        return res.status(400).json({ message: "Email is required" });
      }

      const normalizedEmail = email.toLowerCase().trim();
      
      // Get or create user
      let user = await storage.getUser(normalizedEmail);
      
      if (!user) {
        user = await storage.upsertUser({
          id: normalizedEmail,
          email: normalizedEmail,
          firstName: null,
          lastName: null,
          profileImageUrl: null,
        });
      }

      if (!user) {
        return res.status(500).json({ message: "Failed to create user" });
      }

      // Create JWT token
      const token = createToken({
        userId: user.id,
        email: user.email || normalizedEmail,
        name: user.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : undefined,
      });

      // Set cookie
      setAuthCookie(res, token);

      res.json({ 
        success: true, 
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        }
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
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
