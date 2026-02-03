import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Missing STRIPE_SECRET_KEY environment variable");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-11-20.acacia",
  typescript: true,
});

export const STRIPE_PRICE_IDS = {
  MONTHLY: process.env.STRIPE_PRICE_MONTHLY_ID!,
  YEARLY: process.env.STRIPE_PRICE_YEARLY_ID!,
} as const;

if (!STRIPE_PRICE_IDS.MONTHLY || !STRIPE_PRICE_IDS.YEARLY) {
  throw new Error("Missing Stripe price IDs in environment variables");
}
