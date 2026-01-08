// server/stores/userStore.ts
// Handles user CRUD, authentication helpers, and gamification stats

import {
  users,
  type User,
  type UpsertUser,
} from "../../shared/schema.js";
import { db } from "../db.js";
import { eq } from "drizzle-orm";

export interface IUserStore {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserGamificationStats(userId: string, xp: number, level: number): Promise<User>;
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
