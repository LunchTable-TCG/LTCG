import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth, getAuthUserId } from "@convex-dev/auth/server";
import type { DataModel } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { fullUserValidator } from "./lib/returnValidators";

/**
 * Generate a secure random token for email verification
 */
function generateEmailToken(): string {
  const chars = "0123456789";
  let token = "";
  const array = new Uint8Array(8);
  crypto.getRandomValues(array);
  for (let i = 0; i < 8; i++) {
    token += chars[array[i]! % chars.length];
  }
  return token;
}

/**
 * Password Reset Email Provider using Resend API
 *
 * Uses direct HTTP calls to Resend API - no package dependencies
 * Development mode: Logs to console if RESEND_API_KEY not set
 * Production mode: Sends real emails via Resend
 */
const ResendPasswordReset = {
  id: "resend-otp-reset",
  name: "Resend Password Reset",
  type: "email" as const,
  maxAge: 60 * 15, // 15 minutes
  async generateVerificationToken() {
    return generateEmailToken();
  },
  async sendVerificationRequest({
    identifier: email,
    token,
  }: { identifier: string; token: string }) {
    const apiKey = process.env.RESEND_API_KEY;

    // Development mode: Log to console if no API key
    if (!apiKey) {
      console.log("=".repeat(60));
      console.log(`PASSWORD RESET EMAIL (Development Mode)`);
      console.log(`To: ${email}`);
      console.log(`Code: ${token}`);
      console.log(`Expires in: 15 minutes`);
      console.log("⚠️  Set RESEND_API_KEY to send real emails");
      console.log("=".repeat(60));
      return;
    }

    // Production mode: Send email via Resend API
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #d4af37;">Password Reset Request</h2>
        <p>You requested to reset your password for Lunchtable.</p>
        <p>Your password reset code is:</p>
        <div style="background-color: #f5f5f5; padding: 16px; border-radius: 8px; text-align: center; margin: 24px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #1a1614;">${token}</span>
        </div>
        <p>This code will expire in 15 minutes.</p>
        <p>If you didn't request this password reset, you can safely ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 32px 0;" />
        <p style="color: #666; font-size: 12px;">Lunchtable - The Trading Card Game</p>
      </div>
    `;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.AUTH_EMAIL ?? "Lunchtable <onboarding@resend.dev>",
        to: [email],
        subject: "Reset Your Lunchtable Password",
        html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`Failed to send password reset email to ${email}:`, error);
      throw new Error(`Failed to send email: ${error}`);
    }

    console.log(`✅ Password reset email sent to ${email}`);
  },
};

/**
 * Email Verification Provider using Resend API
 *
 * Sends verification codes to new users during signup to verify email ownership
 * Note: Email verification is optional. Uncomment the `verify` option below to enable it.
 */
const ResendEmailVerification = {
  id: "resend-otp-verify",
  name: "Resend Email Verification",
  type: "email" as const,
  maxAge: 60 * 10, // 10 minutes
  async generateVerificationToken() {
    return generateEmailToken();
  },
  async sendVerificationRequest({
    identifier: email,
    token,
  }: { identifier: string; token: string }) {
    const apiKey = process.env.RESEND_API_KEY;

    // Development mode: Log to console if no API key
    if (!apiKey) {
      console.log("=".repeat(60));
      console.log(`EMAIL VERIFICATION (Development Mode)`);
      console.log(`To: ${email}`);
      console.log(`Code: ${token}`);
      console.log(`Expires in: 10 minutes`);
      console.log("⚠️  Set RESEND_API_KEY to send real emails");
      console.log("=".repeat(60));
      return;
    }

    // Production mode: Send email via Resend API
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #d4af37;">Welcome to Lunchtable!</h2>
        <p>Thank you for signing up. To complete your registration, please verify your email address.</p>
        <p>Your verification code is:</p>
        <div style="background-color: #f5f5f5; padding: 16px; border-radius: 8px; text-align: center; margin: 24px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #1a1614;">${token}</span>
        </div>
        <p>This code will expire in 10 minutes.</p>
        <p>If you didn't create an account with Lunchtable, you can safely ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 32px 0;" />
        <p style="color: #666; font-size: 12px;">Lunchtable - The Trading Card Game</p>
      </div>
    `;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.AUTH_EMAIL ?? "Lunchtable <onboarding@resend.dev>",
        to: [email],
        subject: "Verify Your Lunchtable Email",
        html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`Failed to send verification email to ${email}:`, error);
      throw new Error(`Failed to send email: ${error}`);
    }

    console.log(`✅ Verification email sent to ${email}`);
  },
};

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password<DataModel>({
      reset: ResendPasswordReset,
      // OPTIONAL: Uncomment the line below to require email verification for new signups
      // verify: ResendEmailVerification,
      profile(params) {
        const flow = params.flow as string;

        // Only initialize custom fields on signUp, not signIn
        if (flow === "signUp") {
          return {
            email: params.email as string,
            name: params.name as string,
            // Initialize custom game fields ONLY on sign up
            username: params.name as string,
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
          };
        }

        // For signIn, just return email
        return {
          email: params.email as string,
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
