#!/usr/bin/env tsx
/**
 * scripts/seed-plans.ts
 * 
 * Standalone script to seed Guardian subscription plan in Stripe and database.
 * 
 * Usage:
 *   npx tsx scripts/seed-plans.ts
 *   npm run seed:plans
 * 
 * This script is idempotent - running it multiple times will not create duplicates.
 * It will skip seeding if the Guardian plan already exists and is valid.
 */

import "dotenv/config";
import Stripe from "stripe";
import { db } from "../server/db.js";
import { subscriptionPlans } from "../shared/schema.js";
import { eq } from "drizzle-orm";

// Guardian subscription plan configuration
const GUARDIAN_PLAN_CONFIG = {
  name: 'Guardian',
  description: 'Complete bot security automation with recurring scans, real-time change alerts, unlimited scan history, all premium builder fields, and 2x XP bonus.',
  amount: 2900, // $29.00 in cents
  currency: 'usd',
  interval: 'month' as const,
  features: [
    'Unlimited Full Scans',
    'Detailed Error Analysis',
    'Recurring Scans (Daily/Weekly/Monthly)',
    'Real-time Change Alerts',
    'Unlimited Scan History',
    'Scan Comparison Tool',
    'All Premium Builder Fields',
    'Unlimited PDF Exports',
    '2x XP Bonus',
    'Priority Support'
  ]
};

function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('Missing required environment variable: STRIPE_SECRET_KEY');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

async function getSubscriptionPlans(activeOnly: boolean = true) {
  if (activeOnly) {
    return await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.isActive, true))
      .orderBy(subscriptionPlans.sortOrder);
  }
  return await db
    .select()
    .from(subscriptionPlans)
    .orderBy(subscriptionPlans.sortOrder);
}

async function seedGuardianPlan(): Promise<void> {
  console.log('[Seed] Starting Guardian plan seeding...');
  
  // Check if Stripe is configured
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('[Seed] ERROR: STRIPE_SECRET_KEY not set. Cannot seed plans.');
    process.exit(1);
  }

  const stripe = getStripe();

  // Check if we already have a Guardian plan in the database
  const existingPlans = await getSubscriptionPlans(true);
  const existingGuardian = existingPlans.find(p => 
    p.name?.toLowerCase().includes('guardian') && p.stripePriceId
  );

  if (existingGuardian) {
    // Verify the price still exists and is valid in Stripe
    try {
      const price = await stripe.prices.retrieve(existingGuardian.stripePriceId);
      if (price.active && price.recurring) {
        console.log(`[Seed] Guardian plan already exists and is valid: ${existingGuardian.stripePriceId}`);
        console.log('[Seed] No action needed. Exiting.');
        return;
      }
    } catch (e) {
      console.log('[Seed] Existing Guardian price invalid or not found in Stripe, will create new one');
    }
  }

  console.log('[Seed] Creating/updating Guardian subscription plan...');

  // Look for existing Guardian product in Stripe
  const products = await stripe.products.list({ active: true, limit: 100 });
  let guardianProduct = products.data.find(p => 
    p.name.toLowerCase().includes('guardian')
  );

  // Create product if it doesn't exist
  if (!guardianProduct) {
    console.log('[Seed] Creating Guardian product in Stripe...');
    guardianProduct = await stripe.products.create({
      name: GUARDIAN_PLAN_CONFIG.name,
      description: GUARDIAN_PLAN_CONFIG.description,
      metadata: {
        features: JSON.stringify(GUARDIAN_PLAN_CONFIG.features),
        sort_order: '1'
      }
    });
    console.log(`[Seed] Created Guardian product: ${guardianProduct.id}`);
  } else {
    console.log(`[Seed] Found existing Guardian product: ${guardianProduct.id}`);
  }

  // Check if a recurring price already exists for this product
  const existingPrices = await stripe.prices.list({
    product: guardianProduct.id,
    active: true,
    type: 'recurring',
    limit: 10
  });

  let recurringPrice = existingPrices.data.find(p => 
    p.recurring?.interval === GUARDIAN_PLAN_CONFIG.interval &&
    p.unit_amount === GUARDIAN_PLAN_CONFIG.amount &&
    p.currency === GUARDIAN_PLAN_CONFIG.currency
  );

  // Create recurring price if it doesn't exist
  if (!recurringPrice) {
    console.log('[Seed] Creating recurring price for Guardian...');
    recurringPrice = await stripe.prices.create({
      product: guardianProduct.id,
      unit_amount: GUARDIAN_PLAN_CONFIG.amount,
      currency: GUARDIAN_PLAN_CONFIG.currency,
      recurring: {
        interval: GUARDIAN_PLAN_CONFIG.interval,
      },
      metadata: {
        plan_name: 'guardian'
      }
    });
    console.log(`[Seed] Created recurring price: ${recurringPrice.id}`);
  } else {
    console.log(`[Seed] Found existing recurring price: ${recurringPrice.id}`);
  }

  // Save to database (upsert based on stripePriceId)
  const planData = {
    stripePriceId: recurringPrice.id,
    stripeProductId: guardianProduct.id,
    name: GUARDIAN_PLAN_CONFIG.name,
    description: GUARDIAN_PLAN_CONFIG.description,
    amount: GUARDIAN_PLAN_CONFIG.amount,
    currency: GUARDIAN_PLAN_CONFIG.currency,
    interval: GUARDIAN_PLAN_CONFIG.interval,
    intervalCount: 1,
    features: GUARDIAN_PLAN_CONFIG.features,
    isActive: true,
    sortOrder: 1,
  };

  const [plan] = await db
    .insert(subscriptionPlans)
    .values(planData)
    .onConflictDoUpdate({
      target: subscriptionPlans.stripePriceId,
      set: { ...planData, updatedAt: new Date() },
    })
    .returning();

  console.log(`[Seed] Guardian plan seeded successfully!`);
  console.log(`[Seed]   - Stripe Product ID: ${plan.stripeProductId}`);
  console.log(`[Seed]   - Stripe Price ID: ${plan.stripePriceId}`);
  console.log(`[Seed]   - DB Plan ID: ${plan.id}`);
}

// Run the seeding
seedGuardianPlan()
  .then(() => {
    console.log('[Seed] Seeding complete.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('[Seed] Fatal error during seeding:', error);
    process.exit(1);
  });

