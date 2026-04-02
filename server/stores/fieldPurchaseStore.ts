// server/stores/fieldPurchaseStore.ts
// Handles premium field purchases (LLMs and Robots) and domain cooldowns

import {
  llmsFieldPurchases,
  robotsFieldPurchases,
  userDomainCooldowns,
  type LlmsFieldPurchase,
  type InsertLlmsFieldPurchase,
  type RobotsFieldPurchase,
  type InsertRobotsFieldPurchase,
} from "../../shared/schema.js";
import { db } from "../db.js";
import { eq, and } from "drizzle-orm";

export interface IFieldPurchaseStore {
  // Premium LLMs Field operations
  createLlmsFieldPurchase(purchase: InsertLlmsFieldPurchase): Promise<LlmsFieldPurchase>;
  getUserLlmsFieldPurchases(userId: string): Promise<LlmsFieldPurchase[]>;
  hasUserPurchasedField(userId: string, fieldKey: string): Promise<boolean>;
  getLlmsFieldPurchaseByPaymentIntent(paymentIntentId: string): Promise<LlmsFieldPurchase | undefined>;
  
  // Premium Robots Field operations
  createRobotsFieldPurchase(purchase: InsertRobotsFieldPurchase): Promise<RobotsFieldPurchase>;
  getUserRobotsFieldPurchases(userId: string): Promise<RobotsFieldPurchase[]>;
  hasUserPurchasedRobotsField(userId: string, fieldKey: string): Promise<boolean>;
  getRobotsFieldPurchaseByPaymentIntent(paymentIntentId: string): Promise<RobotsFieldPurchase | undefined>;
  
  // Domain cooldown operations
  checkDomainCooldown(userId: string, domain: string): Promise<boolean>;
  upsertDomainCooldown(userId: string, domain: string): Promise<void>;
}

export class FieldPurchaseStore implements IFieldPurchaseStore {
  // ============== Premium LLMs Field Operations ==============

  async createLlmsFieldPurchase(purchase: InsertLlmsFieldPurchase): Promise<LlmsFieldPurchase> {
    const [created] = await db.insert(llmsFieldPurchases).values(purchase).returning();
    return created;
  }

  async getUserLlmsFieldPurchases(userId: string): Promise<LlmsFieldPurchase[]> {
    return await db
      .select()
      .from(llmsFieldPurchases)
      .where(eq(llmsFieldPurchases.userId, userId));
  }

  async hasUserPurchasedField(userId: string, fieldKey: string): Promise<boolean> {
    const [result] = await db
      .select()
      .from(llmsFieldPurchases)
      .where(and(
        eq(llmsFieldPurchases.userId, userId),
        eq(llmsFieldPurchases.fieldKey, fieldKey)
      ));
    return !!result;
  }

  async getLlmsFieldPurchaseByPaymentIntent(paymentIntentId: string): Promise<LlmsFieldPurchase | undefined> {
    const [purchase] = await db
      .select()
      .from(llmsFieldPurchases)
      .where(eq(llmsFieldPurchases.stripePaymentIntentId, paymentIntentId));
    return purchase;
  }

  // ============== Premium Robots Field Operations ==============

  async createRobotsFieldPurchase(purchase: InsertRobotsFieldPurchase): Promise<RobotsFieldPurchase> {
    const [created] = await db.insert(robotsFieldPurchases).values(purchase).returning();
    return created;
  }

  async getUserRobotsFieldPurchases(userId: string): Promise<RobotsFieldPurchase[]> {
    return await db
      .select()
      .from(robotsFieldPurchases)
      .where(eq(robotsFieldPurchases.userId, userId));
  }

  async hasUserPurchasedRobotsField(userId: string, fieldKey: string): Promise<boolean> {
    const [result] = await db
      .select()
      .from(robotsFieldPurchases)
      .where(and(
        eq(robotsFieldPurchases.userId, userId),
        eq(robotsFieldPurchases.fieldKey, fieldKey)
      ));
    return !!result;
  }

  async getRobotsFieldPurchaseByPaymentIntent(paymentIntentId: string): Promise<RobotsFieldPurchase | undefined> {
    const [purchase] = await db
      .select()
      .from(robotsFieldPurchases)
      .where(eq(robotsFieldPurchases.stripePaymentIntentId, paymentIntentId));
    return purchase;
  }

  // ============== Domain Cooldown Operations ==============

  async checkDomainCooldown(userId: string, domain: string): Promise<boolean> {
    const [cooldown] = await db
      .select()
      .from(userDomainCooldowns)
      .where(and(
        eq(userDomainCooldowns.userId, userId),
        eq(userDomainCooldowns.domain, domain)
      ));

    if (!cooldown) return false;

    const now = new Date();
    const cooldownPeriod = 24 * 60 * 60 * 1000;
    const timeSinceLastScan = now.getTime() - cooldown.lastScanAt.getTime();

    return timeSinceLastScan < cooldownPeriod;
  }

  async upsertDomainCooldown(userId: string, domain: string): Promise<void> {
    await db
      .insert(userDomainCooldowns)
      .values({ userId, domain })
      .onConflictDoUpdate({
        target: [userDomainCooldowns.userId, userDomainCooldowns.domain],
        set: { lastScanAt: new Date() }
      });
  }
}

export const fieldPurchaseStore = new FieldPurchaseStore();
