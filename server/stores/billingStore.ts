// server/stores/billingStore.ts
// Handles purchases, subscriptions, subscription plans, events, and promotional codes

import {
  purchases,
  scans,
  subscriptions,
  subscriptionEvents,
  subscriptionPlans,
  promotionalCodes,
  promotionalCodeRedemptions,
  type Purchase,
  type InsertPurchase,
  type Subscription,
  type InsertSubscription,
  type SubscriptionEvent,
  type InsertSubscriptionEvent,
  type SubscriptionPlan,
  type InsertSubscriptionPlan,
  type PromotionalCode,
  type InsertPromotionalCode,
  type PromotionalCodeRedemption,
  type InsertPromotionalCodeRedemption,
} from "../../shared/schema.js";
import { db } from "../db.js";
import { eq, desc, and, sql } from "drizzle-orm";

export interface IBillingStore {
  // Purchase operations
  createPurchase(purchase: InsertPurchase): Promise<Purchase>;
  getPurchaseByScanId(scanId: number): Promise<Purchase | undefined>;
  getPurchaseByPaymentIntent(paymentIntentId: string): Promise<Purchase | undefined>;
  getUserHasScanPurchase(userId: string): Promise<boolean>;
  
  // Subscription CRUD
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  getSubscription(id: number): Promise<Subscription | undefined>;
  getSubscriptionByStripeId(stripeSubscriptionId: string): Promise<Subscription | undefined>;
  getUserSubscriptions(userId: string): Promise<Subscription[]>;
  getUserActiveSubscription(userId: string): Promise<Subscription | undefined>;
  updateSubscription(stripeSubscriptionId: string, data: Partial<InsertSubscription>): Promise<Subscription>;
  
  // Subscription events (for webhook idempotency)
  createSubscriptionEvent(event: InsertSubscriptionEvent): Promise<SubscriptionEvent>;
  getSubscriptionEventByStripeId(stripeEventId: string): Promise<SubscriptionEvent | undefined>;
  
  // Subscription plans
  createSubscriptionPlan(plan: InsertSubscriptionPlan): Promise<SubscriptionPlan>;
  getSubscriptionPlans(activeOnly?: boolean): Promise<SubscriptionPlan[]>;
  getSubscriptionPlanByPriceId(stripePriceId: string): Promise<SubscriptionPlan | undefined>;
  updateSubscriptionPlan(id: number, data: Partial<InsertSubscriptionPlan>): Promise<SubscriptionPlan>;
  
  // Promotional code operations
  getPromotionalCode(code: string): Promise<PromotionalCode | undefined>;
  createPromotionalCode(code: InsertPromotionalCode): Promise<PromotionalCode>;
  getPromotionalCodeRedemptionCount(codeId: number): Promise<number>;
  createPromotionalCodeRedemption(redemption: InsertPromotionalCodeRedemption): Promise<PromotionalCodeRedemption>;
  getUserPromotionalCodeRedemptions(userId: string): Promise<PromotionalCodeRedemption[]>;
}

export class BillingStore implements IBillingStore {
  // ============== Purchase Operations ==============

  async createPurchase(insertPurchase: InsertPurchase): Promise<Purchase> {
    const [purchase] = await db
      .insert(purchases)
      .values(insertPurchase)
      .returning();
    return purchase;
  }

  async getPurchaseByScanId(scanId: number): Promise<Purchase | undefined> {
    const [purchase] = await db
      .select()
      .from(purchases)
      .where(eq(purchases.scanId, scanId));
    return purchase;
  }

  async getPurchaseByPaymentIntent(paymentIntentId: string): Promise<Purchase | undefined> {
    const [purchase] = await db
      .select()
      .from(purchases)
      .where(eq(purchases.stripePaymentIntentId, paymentIntentId));
    return purchase;
  }

  async getUserHasScanPurchase(userId: string): Promise<boolean> {
    // purchases.scanId → scans.id → scans.userId (no direct userId on purchases)
    const [row] = await db
      .select({ id: purchases.id })
      .from(purchases)
      .innerJoin(scans, eq(purchases.scanId, scans.id))
      .where(eq(scans.userId, userId))
      .limit(1);
    return row !== undefined;
  }

  // ============== Subscription Operations ==============

  async createSubscription(subscription: InsertSubscription): Promise<Subscription> {
    const [created] = await db
      .insert(subscriptions)
      .values(subscription)
      .returning();
    return created;
  }

  async getSubscription(id: number): Promise<Subscription | undefined> {
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.id, id));
    return subscription;
  }

  async getSubscriptionByStripeId(stripeSubscriptionId: string): Promise<Subscription | undefined> {
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId));
    return subscription;
  }

  async getUserSubscriptions(userId: string): Promise<Subscription[]> {
    return await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .orderBy(desc(subscriptions.createdAt));
  }

  async getUserActiveSubscription(userId: string): Promise<Subscription | undefined> {
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, userId),
          sql`${subscriptions.status} IN ('active', 'trialing')`
        )
      )
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);
    return subscription;
  }

  async updateSubscription(stripeSubscriptionId: string, data: Partial<InsertSubscription>): Promise<Subscription> {
    const [updated] = await db
      .update(subscriptions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId))
      .returning();
    
    if (!updated) throw new Error("Subscription not found");
    return updated;
  }

  // ============== Subscription Event Operations ==============

  async createSubscriptionEvent(event: InsertSubscriptionEvent): Promise<SubscriptionEvent> {
    const [created] = await db
      .insert(subscriptionEvents)
      .values(event)
      .returning();
    return created;
  }

  async getSubscriptionEventByStripeId(stripeEventId: string): Promise<SubscriptionEvent | undefined> {
    const [event] = await db
      .select()
      .from(subscriptionEvents)
      .where(eq(subscriptionEvents.stripeEventId, stripeEventId));
    return event;
  }

  // ============== Subscription Plan Operations ==============

  async createSubscriptionPlan(plan: InsertSubscriptionPlan): Promise<SubscriptionPlan> {
    // Ensure features is properly typed for Drizzle
    const planData = {
      ...plan,
      features: plan.features ? (plan.features as string[]) : [],
    };
    
    const [created] = await db
      .insert(subscriptionPlans)
      .values(planData)
      .onConflictDoUpdate({
        target: subscriptionPlans.stripePriceId,
        set: { ...planData, updatedAt: new Date() },
      })
      .returning();
    return created;
  }

  async getSubscriptionPlans(activeOnly: boolean = true): Promise<SubscriptionPlan[]> {
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

  async getSubscriptionPlanByPriceId(stripePriceId: string): Promise<SubscriptionPlan | undefined> {
    const [plan] = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.stripePriceId, stripePriceId));
    return plan;
  }

  async updateSubscriptionPlan(id: number, data: Partial<InsertSubscriptionPlan>): Promise<SubscriptionPlan> {
    // Ensure features is properly typed for Drizzle if present
    const updateData: Record<string, unknown> = { ...data, updatedAt: new Date() };
    if (data.features !== undefined) {
      updateData.features = data.features as string[];
    }
    
    const [updated] = await db
      .update(subscriptionPlans)
      .set(updateData)
      .where(eq(subscriptionPlans.id, id))
      .returning();
    
    if (!updated) throw new Error("Subscription plan not found");
    return updated;
  }

  // ============== Promotional Code Operations ==============

  async getPromotionalCode(code: string): Promise<PromotionalCode | undefined> {
    const [promoCode] = await db
      .select()
      .from(promotionalCodes)
      .where(eq(promotionalCodes.code, code.toUpperCase()));
    return promoCode;
  }

  async createPromotionalCode(code: InsertPromotionalCode): Promise<PromotionalCode> {
    const [created] = await db
      .insert(promotionalCodes)
      .values({
        ...code,
        code: code.code.toUpperCase(), // Normalize to uppercase
      })
      .returning();
    return created;
  }

  async getPromotionalCodeRedemptionCount(codeId: number): Promise<number> {
    const result = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(promotionalCodeRedemptions)
      .where(eq(promotionalCodeRedemptions.codeId, codeId));
    return Number(result[0]?.count || 0);
  }

  async createPromotionalCodeRedemption(redemption: InsertPromotionalCodeRedemption): Promise<PromotionalCodeRedemption> {
    const [created] = await db
      .insert(promotionalCodeRedemptions)
      .values(redemption)
      .returning();
    return created;
  }

  async getUserPromotionalCodeRedemptions(userId: string): Promise<PromotionalCodeRedemption[]> {
    return await db
      .select()
      .from(promotionalCodeRedemptions)
      .where(eq(promotionalCodeRedemptions.userId, userId))
      .orderBy(desc(promotionalCodeRedemptions.redeemedAt));
  }
}

export const billingStore = new BillingStore();
