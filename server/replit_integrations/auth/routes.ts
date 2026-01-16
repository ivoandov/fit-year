import type { Express } from "express";
import { authStorage } from "./storage";
import { isAuthenticated } from "./replitAuth";

interface SessionUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
}

// Register auth-specific routes
export function registerAuthRoutes(app: Express): void {
  // Get current authenticated user
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const sessionUser = req.user as SessionUser;
      
      let user = await authStorage.getUser(sessionUser.id);
      
      if (!user && sessionUser.email) {
        console.log("[Auth] User not found by ID, trying email fallback:", sessionUser.email);
        user = await authStorage.getUserByEmail(sessionUser.email.toLowerCase());
      }
      
      if (!user) {
        console.log("[Auth] User not found, returning session data as fallback");
        return res.json({
          id: sessionUser.id,
          email: sessionUser.email,
          firstName: sessionUser.firstName,
          lastName: sessionUser.lastName,
          profileImageUrl: sessionUser.profileImageUrl,
        });
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
}
