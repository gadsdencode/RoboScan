import type { Express, RequestHandler } from "express";
import NextAuth, { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import CredentialsProvider from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "./db";
import { users, accounts, verificationTokens } from "@shared/schema";
import { storage } from "./storage";
import session from "express-session";
import connectPg from "connect-pg-simple";
import cookieParser from "cookie-parser";

// Extend NextAuth types to include our user fields
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
    };
  }
  
  interface User {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
  }
}

// Get session middleware for Express
export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
      sameSite: "lax",
    },
  });
}

// NextAuth configuration
// Note: We'll use JWT strategy instead of database sessions for better Express compatibility
const authOptions: NextAuthOptions = {
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    GoogleProvider({
      clientId: process.env.NEXTAUTH_GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.NEXTAUTH_GOOGLE_CLIENT_SECRET || "",
    }),
    GitHubProvider({
      clientId: process.env.NEXTAUTH_GITHUB_CLIENT_ID || "",
      clientSecret: process.env.NEXTAUTH_GITHUB_CLIENT_SECRET || "",
    }),
    // Email/Password provider (optional, for development)
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // For now, this is a placeholder - implement your own auth logic
        // You might want to add a password field to the users table
        if (!credentials?.email) return null;
        
        // Check if user exists
        const user = await storage.getUser(credentials.email);
        if (!user) return null;
        
        // For now, allow any password (you should implement proper password hashing)
        return {
          id: user.id,
          email: user.email || "",
          name: user.firstName && user.lastName 
            ? `${user.firstName} ${user.lastName}` 
            : user.email || null,
          image: user.profileImageUrl || null,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (user?.email) {
        // Upsert user in our storage
        await storage.upsertUser({
          id: user.id,
          email: user.email,
          firstName: profile?.given_name || user.name?.split(" ")[0] || null,
          lastName: profile?.family_name || user.name?.split(" ").slice(1).join(" ") || null,
          profileImageUrl: user.image || null,
        });
      }
      return true;
    },
    async session({ session, token }) {
      if (session.user && token?.sub) {
        session.user.id = token.sub as string;
      }
      return session;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
  },
  pages: {
    signIn: "/api/auth/signin",
    error: "/api/auth/error",
  },
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 1 week
  },
  secret: process.env.NEXTAUTH_SECRET,
  // Set the base URL for NextAuth callbacks
  ...(process.env.NEXTAUTH_URL && { 
    basePath: "/api/auth",
    url: process.env.NEXTAUTH_URL 
  }),
};

// Setup NextAuth with Express
let nextAuthHandler: any = null;

export async function setupAuth(app: Express) {
  try {
    app.set("trust proxy", 1);
    app.use(cookieParser());
    app.use(getSession());

    // Initialize NextAuth handler
    nextAuthHandler = NextAuth(authOptions);
    
    // Mount NextAuth routes
    app.all("/api/auth/*", async (req, res, next) => {
      try {
        await nextAuthHandler(req, res);
      } catch (error) {
        console.error("NextAuth route error:", error);
        if (!res.headersSent) {
          res.status(500).json({ 
            message: "Authentication error",
            error: process.env.NODE_ENV === 'development' ? String(error) : undefined
          });
        }
      }
    });

    // Login route redirect
    app.get("/api/login", (req, res) => {
      try {
        res.redirect("/api/auth/signin");
      } catch (error) {
        console.error("Login redirect error:", error);
        if (!res.headersSent) {
          res.status(500).json({ message: "Failed to redirect to login" });
        }
      }
    });

    // Logout route
    app.get("/api/logout", async (req, res) => {
      try {
        // Clear session
        if (req.session) {
          req.session.destroy((err) => {
            if (err) {
              console.error("Session destroy error:", err);
            }
            res.redirect("/");
          });
        } else {
          res.redirect("/");
        }
      } catch (error) {
        console.error("Logout error:", error);
        if (!res.headersSent) {
          res.status(500).json({ message: "Failed to logout" });
        }
      }
    });
  } catch (error) {
    console.error("Auth setup error:", error);
    throw error;
  }
}

// Authentication middleware
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  try {
    if (!nextAuthHandler) {
      console.error("Auth middleware: nextAuthHandler not initialized");
      return res.status(401).json({ message: "Auth not initialized" });
    }

    // Get session using NextAuth
    // NextAuth expects req/res in Next.js format, so we need to adapt
    let session;
    try {
      session = await nextAuthHandler.getSession({ 
        req: {
          headers: req.headers,
          cookies: (req as any).cookies || {},
        } as any
      });
    } catch (sessionError) {
      console.error("Error getting session:", sessionError);
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!session || !session.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Attach user to request in the format expected by routes
    (req as any).user = {
      claims: {
        sub: session.user.id,
        email: session.user.email,
        name: session.user.name,
      },
    };
    (req as any).isAuthenticated = () => true;

    return next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(401).json({ message: "Unauthorized" });
  }
};

