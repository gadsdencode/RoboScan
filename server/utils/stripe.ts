// server/utils/stripe.ts
// Lazy Stripe initialization - defers env check until actually needed

import Stripe from "stripe";

let stripeInstance: Stripe | null = null;

/**
 * Get the Stripe client lazily.
 * This defers the environment variable check until Stripe is actually needed,
 * preventing serverless function crashes during cold start.
 */
export function getStripe(): Stripe {
  if (!stripeInstance) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
    }
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeInstance;
}
