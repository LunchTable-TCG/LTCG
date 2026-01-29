import { v } from "convex/values";
import { internalAction } from "./_generated/server";

/**
 * Transactional Email Actions using Resend API
 *
 * These actions use direct HTTP calls to Resend - no package dependencies.
 * All emails are sent asynchronously and logged for monitoring.
 */

// biome-ignore lint/complexity/useLiteralKeys: TypeScript requires bracket notation for process.env (TS4111)
const EMAIL_FROM = process.env["AUTH_EMAIL"] ?? "Lunchtable <onboarding@resend.dev>";

async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  // biome-ignore lint/complexity/useLiteralKeys: TypeScript requires bracket notation for process.env (TS4111)
  const apiKey = process.env["RESEND_API_KEY"];

  if (!apiKey) {
    console.log("=".repeat(60));
    console.log("EMAIL (Development Mode)");
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log("⚠️  Set RESEND_API_KEY to send real emails");
    console.log("=".repeat(60));
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: [to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`Failed to send email to ${to}:`, error);
    throw new Error(`Failed to send email: ${error}`);
  }

  console.log(`✅ Email sent to ${to}: ${subject}`);
}

/**
 * Send welcome email to new users
 */
export const sendWelcomeEmail = internalAction({
  args: {
    email: v.string(),
    username: v.string(),
  },
  handler: async (_ctx, { email, username }) => {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #d4af37;">Welcome to Lunchtable, ${username}!</h2>
        <p>We're excited to have you join our trading card game community.</p>

        <h3>Getting Started:</h3>
        <ul>
          <li><strong>Build Your Deck:</strong> Start with your starter deck and customize it as you collect more cards</li>
          <li><strong>Play Story Mode:</strong> Learn the game mechanics through our engaging story chapters</li>
          <li><strong>Challenge Others:</strong> Test your skills in ranked or casual matches</li>
          <li><strong>Collect Cards:</strong> Open packs and trade in the marketplace</li>
        </ul>

        <p>You've received <strong>500 gold</strong> to get started. Visit the shop to open your first pack!</p>

        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 32px 0;" />
        <p style="color: #666; font-size: 12px;">Lunchtable - The Trading Card Game</p>
      </div>
    `;

    await sendEmail({
      to: email,
      subject: "Welcome to Lunchtable!",
      html,
    });
  },
});

/**
 * Send security alert (password changed, suspicious activity, etc.)
 */
export const sendSecurityAlert = internalAction({
  args: {
    email: v.string(),
    username: v.string(),
    alertType: v.string(),
    alertDetails: v.string(),
  },
  handler: async (_ctx, { email, username, alertType, alertDetails }) => {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #d4af37;">Security Alert for ${username}</h2>
        <p><strong>${alertType}</strong></p>
        <p>${alertDetails}</p>

        <p>If this wasn't you, please contact support immediately and change your password.</p>

        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 32px 0;" />
        <p style="color: #666; font-size: 12px;">Lunchtable - The Trading Card Game</p>
      </div>
    `;

    await sendEmail({
      to: email,
      subject: `Security Alert: ${alertType}`,
      html,
    });
  },
});

/**
 * Notify seller when their card is sold
 */
export const sendCardSoldNotification = internalAction({
  args: {
    email: v.string(),
    username: v.string(),
    cardName: v.string(),
    rarity: v.string(),
    price: v.number(),
  },
  handler: async (_ctx, { email, username, cardName, rarity, price }) => {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #d4af37;">Your Card Was Sold!</h2>
        <p>Great news, ${username}!</p>

        <div style="background-color: #f5f5f5; padding: 16px; border-radius: 8px; margin: 24px 0;">
          <p><strong>Card:</strong> ${cardName} (${rarity})</p>
          <p><strong>Sale Price:</strong> ${price} gold</p>
        </div>

        <p>The gold has been added to your account balance.</p>

        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 32px 0;" />
        <p style="color: #666; font-size: 12px;">Lunchtable - The Trading Card Game</p>
      </div>
    `;

    await sendEmail({
      to: email,
      subject: `Card Sold: ${cardName}`,
      html,
    });
  },
});

/**
 * Notify winner when they win an auction
 */
export const sendAuctionWonNotification = internalAction({
  args: {
    email: v.string(),
    username: v.string(),
    cardName: v.string(),
    rarity: v.string(),
    winningBid: v.number(),
  },
  handler: async (_ctx, { email, username, cardName, rarity, winningBid }) => {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #d4af37;">You Won the Auction!</h2>
        <p>Congratulations, ${username}!</p>

        <div style="background-color: #f5f5f5; padding: 16px; border-radius: 8px; margin: 24px 0;">
          <p><strong>Card:</strong> ${cardName} (${rarity})</p>
          <p><strong>Winning Bid:</strong> ${winningBid} gold</p>
        </div>

        <p>The card has been added to your collection and the gold has been deducted from your account.</p>

        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 32px 0;" />
        <p style="color: #666; font-size: 12px;">Lunchtable - The Trading Card Game</p>
      </div>
    `;

    await sendEmail({
      to: email,
      subject: `Auction Won: ${cardName}`,
      html,
    });
  },
});

/**
 * Notify user when they've been outbid
 */
export const sendAuctionOutbidNotification = internalAction({
  args: {
    email: v.string(),
    username: v.string(),
    cardName: v.string(),
    currentBid: v.number(),
    auctionEndsAt: v.string(),
  },
  handler: async (_ctx, { email, username, cardName, currentBid, auctionEndsAt }) => {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #d4af37;">You've Been Outbid!</h2>
        <p>Hi ${username},</p>

        <div style="background-color: #f5f5f5; padding: 16px; border-radius: 8px; margin: 24px 0;">
          <p><strong>Card:</strong> ${cardName}</p>
          <p><strong>Current Highest Bid:</strong> ${currentBid} gold</p>
          <p><strong>Auction Ends:</strong> ${auctionEndsAt}</p>
        </div>

        <p>Someone has placed a higher bid. Place a new bid if you still want this card!</p>

        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 32px 0;" />
        <p style="color: #666; font-size: 12px;">Lunchtable - The Trading Card Game</p>
      </div>
    `;

    await sendEmail({
      to: email,
      subject: `Outbid: ${cardName}`,
      html,
    });
  },
});

/**
 * Notify user of friend request
 */
export const sendFriendRequestNotification = internalAction({
  args: {
    email: v.string(),
    username: v.string(),
    fromUsername: v.string(),
  },
  handler: async (_ctx, { email, username, fromUsername }) => {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #d4af37;">New Friend Request</h2>
        <p>Hi ${username},</p>

        <div style="background-color: #f5f5f5; padding: 16px; border-radius: 8px; margin: 24px 0;">
          <p><strong>${fromUsername}</strong> wants to be your friend!</p>
        </div>

        <p>Log in to accept or decline the friend request.</p>

        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 32px 0;" />
        <p style="color: #666; font-size: 12px;">Lunchtable - The Trading Card Game</p>
      </div>
    `;

    await sendEmail({
      to: email,
      subject: `Friend Request from ${fromUsername}`,
      html,
    });
  },
});
