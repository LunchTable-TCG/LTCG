import Stripe from "stripe";

// Lazy initialization to avoid blocking module load when env vars are missing
let _stripe: Stripe | null = null;

export const getStripe = (): Stripe => {
  if (!_stripe) {
    if (!process.env["STRIPE_SECRET_KEY"]) {
      throw new Error("Missing STRIPE_SECRET_KEY environment variable");
    }
    _stripe = new Stripe(process.env["STRIPE_SECRET_KEY"], {
      apiVersion: "2026-01-28.clover",
      typescript: true,
    });
  }
  return _stripe;
};

// Deprecated: Use getStripe() instead. Kept for backward compatibility.
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    const stripeInstance = getStripe();
    return stripeInstance[prop as keyof Stripe];
  },
});

export const getStripePriceIds = () => {
  const MONTHLY = process.env["STRIPE_PRICE_MONTHLY_ID"];
  const YEARLY = process.env["STRIPE_PRICE_YEARLY_ID"];

  if (!MONTHLY || !YEARLY) {
    throw new Error("Missing Stripe price IDs in environment variables");
  }

  return { MONTHLY, YEARLY } as const;
};

// Deprecated: Use getStripePriceIds() instead. Kept for backward compatibility.
export const STRIPE_PRICE_IDS = {
  get MONTHLY() {
    return getStripePriceIds().MONTHLY;
  },
  get YEARLY() {
    return getStripePriceIds().YEARLY;
  },
};
