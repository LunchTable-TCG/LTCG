import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth, getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import type { DataModel } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { fullUserValidator } from "./lib/returnValidators";

/**
 * SECURITY: Validate password requirements
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 */
function validatePasswordRequirements(password: string) {
  if (!password || password.length < 8) {
    throw new ConvexError({
      code: "PASSWORD_TOO_SHORT",
      message: "Password must be at least 8 characters long",
    });
  }

  if (!/[A-Z]/.test(password)) {
    throw new ConvexError({
      code: "PASSWORD_NO_UPPERCASE",
      message: "Password must contain at least one uppercase letter",
    });
  }

  if (!/[a-z]/.test(password)) {
    throw new ConvexError({
      code: "PASSWORD_NO_LOWERCASE",
      message: "Password must contain at least one lowercase letter",
    });
  }

  if (!/[0-9]/.test(password)) {
    throw new ConvexError({
      code: "PASSWORD_NO_NUMBER",
      message: "Password must contain at least one number",
    });
  }

  // SECURITY: Check for common passwords
  const commonPasswords = ["password", "12345678", "password1", "qwerty123", "admin123"];
  if (commonPasswords.includes(password.toLowerCase())) {
    throw new ConvexError({
      code: "PASSWORD_TOO_COMMON",
      message: "This password is too common. Please choose a stronger password.",
    });
  }
}

/**
 * SECURITY: Validate username format server-side
 * Must match client validation: 3-20 alphanumeric characters
 */
function validateUsername(username: string) {
  const usernameRegex = /^[a-zA-Z0-9]{3,20}$/;

  if (!username || !usernameRegex.test(username)) {
    throw new ConvexError({
      code: "INVALID_USERNAME",
      message:
        "Username must be 3-20 characters: letters and numbers only (no spaces or special characters)",
    });
  }
}

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password<DataModel>({
      // SECURITY: Server-side password validation
      validatePasswordRequirements,

      profile(params) {
        console.log("🔐 Password provider profile() called", {
          // biome-ignore lint/complexity/useLiteralKeys: TypeScript requires bracket notation for index signatures (TS4111)
          flow: params["flow"],
          // biome-ignore lint/complexity/useLiteralKeys: TypeScript requires bracket notation for index signatures (TS4111)
          email: params["email"],
        });
        // biome-ignore lint/complexity/useLiteralKeys: TypeScript requires bracket notation for index signatures (TS4111)
        const flow = params["flow"] as string;

        // Only initialize custom fields on signUp, not signIn
        if (flow === "signUp") {
          console.log("📝 Creating new user profile");

          // biome-ignore lint/complexity/useLiteralKeys: TypeScript requires bracket notation for index signatures (TS4111)
          const name = params["name"] as string;
          // biome-ignore lint/complexity/useLiteralKeys: TypeScript requires bracket notation for index signatures (TS4111)
          const email = params["email"] as string;

          // SECURITY: Validate username format server-side
          validateUsername(name);

          // SECURITY: Normalize email to lowercase
          const normalizedEmail = email.trim().toLowerCase();

          return {
            email: normalizedEmail,
            name: name,
            // Initialize custom game fields ONLY on sign up
            username: name,
            createdAt: Date.now(),
            rankedElo: 1000,
            casualRating: 1000,
            totalWins: 0,
            totalLosses: 0,
            rankedWins: 0,
            rankedLosses: 0,
            casualWins: 0,
            casualLosses: 0,
            storyWins: 0,
            xp: 0,
            level: 1,
            gold: 500,
            isAiAgent: false,
            // SECURITY: Email not verified yet
            emailVerificationTime: undefined,
          };
        }

        // For signIn, normalize email
        // biome-ignore lint/complexity/useLiteralKeys: TypeScript requires bracket notation for index signatures (TS4111)
        const email = params["email"] as string;
        return {
          email: email.trim().toLowerCase(),
        };
      },
    }),
  ],
});

export const loggedInUser = query({
  args: {},
  returns: fullUserValidator,
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    const user = await ctx.db.get(userId);
    if (!user) {
      return null;
    }
    return user;
  },
});
