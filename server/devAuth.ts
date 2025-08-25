import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

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
      secure: false, // Set to false for development
      maxAge: sessionTtl,
    },
  });
}

export async function setupDevAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  // Development login route - creates a mock user session
  app.get("/api/login", (req, res) => {
    (req as any).user = {
      claims: {
        sub: "dev-user-123",
        email: "dev@example.com",
        first_name: "Developer",
        last_name: "User",
        profile_image_url: "https://via.placeholder.com/150"
      }
    };
    res.redirect("/");
  });

  // Development logout route
  app.get("/api/logout", (req, res) => {
    req.session.destroy(() => {
      res.redirect("/");
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  // For development, always authenticate with a mock user
  if (!req.session.user) {
    req.session.user = {
      claims: {
        sub: "dev-user-123",
        email: "dev@example.com",
        first_name: "Developer",
        last_name: "User",
        profile_image_url: "https://via.placeholder.com/150"
      }
    };
    
    // Ensure the dev user exists in the database with admin role
    try {
      await storage.upsertUser({
        id: "dev-user-123",
        email: "dev@example.com",
        firstName: "Developer",
        lastName: "User",
        profileImageUrl: "https://via.placeholder.com/150",
        role: "admin"
      });
    } catch (error) {
      console.log("Dev user creation note:", error);
    }
  }
  
  (req as any).user = req.session.user;
  next();
};