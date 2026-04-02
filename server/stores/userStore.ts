// server/stores/userStore.ts
// Handles user CRUD, authentication helpers, and gamification stats

import {
  users,
  type User,
  type UpsertUser,
} from "../../shared/schema.js";
import { db } from "../db.js";
import { eq, sql } from "drizzle-orm";
import { DOMAIN_COOLDOWN_HOURS } from "../../shared/gamification.js";

/** Result row from DB function award_scan_xp_with_cooldown (see migrations/0008). */
export interface AwardScanXpWithCooldownRow {
  xpGained: number;
  totalXp: number;
  newLevel: number;
  oldLevel: number;
  levelUp: boolean;
  cooldownActive: boolean;
  userFound: boolean;
}

export interface IUserStore {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserGamificationStats(userId: string, xp: number, level: number): Promise<User>;
  /**
   * Atomically adds XP and recalculates level (must match shared/gamification calculateLevel).
   * Prefer over updateUserGamificationStats for all additive XP.
   */
  incrementUserXpByDelta(userId: string, deltaXp: number): Promise<User>;
  /**
   * Single round-trip: advisory lock + cooldown check + optional XP increment + cooldown upsert.
   */
  awardScanXpWithCooldown(
    userId: string,
    domain: string,
    xpDelta: number,
    cooldownHours?: number
  ): Promise<AwardScanXpWithCooldownRow>;
  updateUserPassword(userId: string, passwordHash: string): Promise<User>;
  updateUserStripeCustomerId(userId: string, stripeCustomerId: string): Promise<User>;
  getUserByStripeCustomerId(stripeCustomerId: string): Promise<User | undefined>;
}

export class UserStore implements IUserStore {
  async getUser(id: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    } catch (error) {
      console.error("[UserStore] Error in getUser:", error);
      throw new Error(`Failed to get user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    try {
      const [user] = await db
        .insert(users)
        .values(userData)
        .onConflictDoUpdate({
          target: users.id,
          set: {
            ...userData,
            updatedAt: new Date(),
          },
        })
        .returning();
      if (!user) {
        throw new Error("upsertUser returned no user");
      }
      return user;
    } catch (error) {
      console.error("[UserStore] Error in upsertUser:", error);
      throw new Error(`Failed to upsert user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateUserGamificationStats(userId: string, xp: number, level: number): Promise<User> {
    const [updated] = await db
      .update(users)
      .set({ 
        xp, 
        level, 
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId))
      .returning();
      
    if (!updated) throw new Error("User not found");
    return updated;
  }

  async incrementUserXpByDelta(userId: string, deltaXp: number): Promise<User> {
    if (deltaXp <= 0) {
      const u = await this.getUser(userId);
      if (!u) throw new Error("User not found");
      return u;
    }
    const [updated] = await db
      .update(users)
      .set({
        xp: sql`${users.xp} + ${deltaXp}`,
        level: sql`(floor(sqrt(((${users.xp} + ${deltaXp})::numeric / 100))) + 1)::int`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    if (!updated) throw new Error("User not found");
    return updated;
  }

  async awardScanXpWithCooldown(
    userId: string,
    domain: string,
    xpDelta: number,
    cooldownHours: number = DOMAIN_COOLDOWN_HOURS
  ): Promise<AwardScanXpWithCooldownRow> {
    const result = await db.execute(sql`
      SELECT * FROM award_scan_xp_with_cooldown(
        ${userId},
        ${domain},
        ${xpDelta},
        ${cooldownHours}
      )
    `);
    const row = result.rows[0] as Record<string, unknown> | undefined;
    if (!row) {
      return {
        xpGained: 0,
        totalXp: 0,
        newLevel: 0,
        oldLevel: 0,
        levelUp: false,
        cooldownActive: false,
        userFound: false,
      };
    }
    const num = (v: unknown) => (typeof v === "string" ? Number(v) : Number(v ?? 0));
    const bool = (v: unknown) => v === true || v === "t" || v === "true";
    return {
      xpGained: num(row.xp_gained),
      totalXp: num(row.total_xp),
      newLevel: num(row.new_level),
      oldLevel: num(row.old_level),
      levelUp: bool(row.level_up),
      cooldownActive: bool(row.cooldown_active),
      userFound: bool(row.user_found),
    };
  }

  async updateUserPassword(userId: string, passwordHash: string): Promise<User> {
    const [updated] = await db
      .update(users)
      .set({ 
        passwordHash, 
        passwordSetAt: new Date(),
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId))
      .returning();
      
    if (!updated) throw new Error("User not found");
    return updated;
  }

  async updateUserStripeCustomerId(userId: string, stripeCustomerId: string): Promise<User> {
    const [updated] = await db
      .update(users)
      .set({ stripeCustomerId, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    
    if (!updated) throw new Error("User not found");
    return updated;
  }

  async getUserByStripeCustomerId(stripeCustomerId: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.stripeCustomerId, stripeCustomerId));
    return user;
  }
}

export const userStore = new UserStore();
