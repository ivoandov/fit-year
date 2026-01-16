import passport from "passport";
import { Strategy as GoogleStrategy, Profile } from "passport-google-oauth20";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { authStorage } from "./storage";

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
      secure: true,
      maxAge: sessionTtl,
    },
  });
}

interface SessionUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
}

async function findOrCreateUser(profile: Profile): Promise<SessionUser> {
  const rawEmail = profile.emails?.[0]?.value;
  const googleId = profile.id;
  const firstName = profile.name?.givenName || null;
  const lastName = profile.name?.familyName || null;
  const profileImageUrl = profile.photos?.[0]?.value || null;

  if (!rawEmail) {
    throw new Error("No email found in Google profile");
  }

  const email = rawEmail.toLowerCase().trim();

  console.log("[Auth] Google OAuth profile:", {
    googleId,
    email,
    firstName,
    lastName,
    profileImageUrl,
  });

  const existingUser = await authStorage.getUserByEmail(email);
  
  if (existingUser) {
    console.log("[Auth] Found existing user by email:", existingUser.id);
    try {
      const updatedUser = await authStorage.updateUserById(existingUser.id, {
        firstName: firstName || existingUser.firstName,
        lastName: lastName || existingUser.lastName,
        profileImageUrl: profileImageUrl || existingUser.profileImageUrl,
      });
      return {
        id: existingUser.id,
        email: existingUser.email!,
        firstName: updatedUser?.firstName || existingUser.firstName,
        lastName: updatedUser?.lastName || existingUser.lastName,
        profileImageUrl: updatedUser?.profileImageUrl || profileImageUrl,
      };
    } catch (updateError) {
      console.error("[Auth] Error updating existing user, returning as-is:", updateError);
      return {
        id: existingUser.id,
        email: existingUser.email!,
        firstName: existingUser.firstName,
        lastName: existingUser.lastName,
        profileImageUrl: existingUser.profileImageUrl || profileImageUrl,
      };
    }
  }

  console.log("[Auth] Creating new user with Google ID:", googleId);
  const newUser = await authStorage.upsertUser({
    id: googleId,
    email,
    firstName,
    lastName,
    profileImageUrl,
  });

  return {
    id: newUser.id,
    email: newUser.email!,
    firstName: newUser.firstName,
    lastName: newUser.lastName,
    profileImageUrl: newUser.profileImageUrl,
  };
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const clientID = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientID || !clientSecret) {
    console.error("[Auth] GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required for authentication");
    return;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID,
        clientSecret,
        callbackURL: "/api/callback",
        passReqToCallback: false,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const user = await findOrCreateUser(profile);
          done(null, user);
        } catch (error) {
          console.error("[Auth] Error in Google OAuth callback:", error);
          done(error as Error);
        }
      }
    )
  );

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  function getCallbackURL(req: any): string {
    // Use explicit env var if set
    if (process.env.AUTH_CALLBACK_URL) {
      return process.env.AUTH_CALLBACK_URL;
    }
    
    // Get host from request headers
    const host = req.headers['x-forwarded-host'] || req.get('host') || '';
    
    // If accessing via published .replit.app domain, use that
    if (host.includes('.replit.app')) {
      return `https://${host}/api/callback`;
    }
    
    // For dev preview, use REPLIT_DEV_DOMAIN for consistency
    if (process.env.REPLIT_DEV_DOMAIN) {
      return `https://${process.env.REPLIT_DEV_DOMAIN}/api/callback`;
    }
    
    // Fallback to request headers
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    return `${protocol}://${host}/api/callback`;
  }

  app.get("/api/login", (req, res, next) => {
    const callbackURL = getCallbackURL(req);
    
    console.log("[Auth] Login initiated with callback URL:", callbackURL);
    
    passport.authenticate("google", {
      scope: ["profile", "email"],
      prompt: "select_account",
      callbackURL,
    } as any)(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    const callbackURL = getCallbackURL(req);
    
    console.log("[Auth] Callback received with URL:", callbackURL);
    console.log("[Auth] Callback query params:", req.query);
    
    passport.authenticate("google", {
      failureRedirect: "/",
      callbackURL,
      failureMessage: true,
    } as any, (err: any, user: any, info: any) => {
      if (err) {
        console.error("[Auth] Callback error:", err);
        return res.redirect("/");
      }
      if (!user) {
        console.error("[Auth] Callback no user - info:", info);
        return res.redirect("/");
      }
      req.logIn(user, (loginErr) => {
        if (loginErr) {
          console.error("[Auth] Login error:", loginErr);
          return res.redirect("/");
        }
        console.log("[Auth] Login successful for user:", user.email);
        res.redirect("/");
      });
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect("/");
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  return next();
};
