// Reference: blueprint:javascript_log_in_with_replit
import {
  users,
  scans,
  purchases,
  recurringScans,
  notificationPreferences,
  notifications,
  achievements,
  userAchievements,
  llmsFieldPurchases,
  type User,
  type UpsertUser,
  type Scan,
  type InsertScan,
  type Purchase,
  type InsertPurchase,
  type RecurringScan,
  type InsertRecurringScan,
  type NotificationPreference,
  type InsertNotificationPreference,
  type Notification,
  type InsertNotification,
  type Achievement,
  type UserAchievement,
  type LlmsFieldPurchase,
  type InsertLlmsFieldPurchase,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, lte, arrayContains, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserGamificationStats(userId: string, xp: number, level: number): Promise<User>;
  
  // Scan operations
  createScan(scan: InsertScan): Promise<Scan>;
  getScan(id: number): Promise<Scan | undefined>;
  getUserScans(userId: string, tagFilter?: string[], limit?: number, offset?: number): Promise<Scan[]>;
  getScanById(scanId: number, userId: string): Promise<Scan | null>;
  updateScanTags(id: number, tags: string[]): Promise<Scan>;
  getAllUserTags(userId: string): Promise<string[]>;
  
  // Purchase operations
  createPurchase(purchase: InsertPurchase): Promise<Purchase>;
  getPurchaseByScanId(scanId: number): Promise<Purchase | undefined>;
  getPurchaseByPaymentIntent(paymentIntentId: string): Promise<Purchase | undefined>;
  
  // Recurring scan operations
  createRecurringScan(recurringScan: InsertRecurringScan): Promise<RecurringScan>;
  getRecurringScan(id: number): Promise<RecurringScan | undefined>;
  getUserRecurringScans(userId: string): Promise<RecurringScan[]>;
  updateRecurringScan(id: number, data: Partial<InsertRecurringScan>): Promise<RecurringScan>;
  deleteRecurringScan(id: number): Promise<void>;
  getDueRecurringScans(): Promise<RecurringScan[]>;
  
  // Notification preference operations
  createNotificationPreference(pref: InsertNotificationPreference): Promise<NotificationPreference>;
  getNotificationPreferenceByRecurringScanId(recurringScanId: number): Promise<NotificationPreference | undefined>;
  updateNotificationPreference(id: number, data: Partial<InsertNotificationPreference>): Promise<NotificationPreference>;
  
  // Notification operations
  createNotification(notification: InsertNotification): Promise<Notification>;
  getUserNotifications(userId: string, limit?: number, offset?: number): Promise<Notification[]>;
  getUnreadNotificationCount(userId: string): Promise<number>;
  markNotificationAsRead(id: number): Promise<void>;
  markAllNotificationsAsRead(userId: string): Promise<void>;
  
  // Achievement operations
  getAchievementByKey(key: string): Promise<Achievement | undefined>;
  unlockAchievement(userId: string, achievementKey: string): Promise<{ unlocked: boolean, achievement?: Achievement }>;
  createAchievement(data: any): Promise<Achievement>;
  getUserAchievements(userId: string): Promise<Array<{
    id: number;
    userId: string;
    achievementId: number;
    unlockedAt: Date | null;
    achievementKey: string;
    achievementName: string;
    achievementDescription: string;
    xpReward: number;
    icon: string;
  }>>;
  
  // Premium LLMs Field operations
  createLlmsFieldPurchase(purchase: InsertLlmsFieldPurchase): Promise<LlmsFieldPurchase>;
  getUserLlmsFieldPurchases(userId: string): Promise<LlmsFieldPurchase[]>;
  hasUserPurchasedField(userId: string, fieldKey: string): Promise<boolean>;
  getLlmsFieldPurchaseByPaymentIntent(paymentIntentId: string): Promise<LlmsFieldPurchase | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
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
    return user;
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

  async createScan(insertScan: InsertScan): Promise<Scan> {
    const [scan] = await db.insert(scans).values(insertScan as any).returning();
    return scan;
  }

  async getScan(id: number): Promise<Scan | undefined> {
    const [scan] = await db.select().from(scans).where(eq(scans.id, id));
    return scan;
  }

  async getUserScans(userId: string, tagFilter?: string[], limit: number = 50, offset: number = 0): Promise<Scan[]> {
    const safeLimit = !limit || isNaN(limit) || limit < 1 ? 50 : Math.min(limit, 100);
    const safeOffset = !offset || isNaN(offset) || offset < 0 ? 0 : offset;

    const query = tagFilter && tagFilter.length > 0
      ? db
          .select()
          .from(scans)
          .where(
            and(
              eq(scans.userId, userId),
              sql`${scans.tags} && ${tagFilter}`
            )
          )
          .orderBy(desc(scans.createdAt))
      : db
          .select()
          .from(scans)
          .where(eq(scans.userId, userId))
          .orderBy(desc(scans.createdAt));

    return await query.limit(safeLimit).offset(safeOffset);
  }

  async getScanById(scanId: number, userId: string): Promise<Scan | null> {
    const [scan] = await db
      .select()
      .from(scans)
      .where(and(eq(scans.id, scanId), eq(scans.userId, userId)))
      .limit(1);
    
    return scan || null;
  }

  async updateScanTags(id: number, tags: string[]): Promise<Scan> {
    const [scan] = await db
      .update(scans)
      .set({ tags })
      .where(eq(scans.id, id))
      .returning();
    return scan;
  }

  async getAllUserTags(userId: string): Promise<string[]> {
    const userScans = await db
      .select({ tags: scans.tags })
      .from(scans)
      .where(eq(scans.userId, userId));

    const allTags = new Set<string>();
    userScans.forEach((scan) => {
      if (scan.tags) {
        scan.tags.forEach((tag) => allTags.add(tag));
      }
    });

    return Array.from(allTags).sort();
  }

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

  // Recurring scan operations
  async createRecurringScan(insertRecurringScan: InsertRecurringScan): Promise<RecurringScan> {
    const [recurringScan] = await db
      .insert(recurringScans)
      .values(insertRecurringScan)
      .returning();
    return recurringScan;
  }

  async getRecurringScan(id: number): Promise<RecurringScan | undefined> {
    const [recurringScan] = await db
      .select()
      .from(recurringScans)
      .where(eq(recurringScans.id, id));
    return recurringScan;
  }

  async getUserRecurringScans(userId: string): Promise<RecurringScan[]> {
    return await db
      .select()
      .from(recurringScans)
      .where(eq(recurringScans.userId, userId))
      .orderBy(desc(recurringScans.createdAt));
  }

  async updateRecurringScan(id: number, data: Partial<InsertRecurringScan>): Promise<RecurringScan> {
    const [updated] = await db
      .update(recurringScans)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(recurringScans.id, id))
      .returning();
    return updated;
  }

  async deleteRecurringScan(id: number): Promise<void> {
    await db.delete(recurringScans).where(eq(recurringScans.id, id));
  }

  async getDueRecurringScans(): Promise<RecurringScan[]> {
    const now = new Date();
    return await db
      .select()
      .from(recurringScans)
      .where(
        and(
          eq(recurringScans.isActive, true),
          lte(recurringScans.nextRunAt, now)
        )
      );
  }

  // Notification preference operations
  async createNotificationPreference(insertPref: InsertNotificationPreference): Promise<NotificationPreference> {
    const [pref] = await db
      .insert(notificationPreferences)
      .values(insertPref)
      .returning();
    return pref;
  }

  async getNotificationPreferenceByRecurringScanId(recurringScanId: number): Promise<NotificationPreference | undefined> {
    const [pref] = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.recurringScanId, recurringScanId));
    return pref;
  }

  async updateNotificationPreference(id: number, data: Partial<InsertNotificationPreference>): Promise<NotificationPreference> {
    const [updated] = await db
      .update(notificationPreferences)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(notificationPreferences.id, id))
      .returning();
    return updated;
  }

  // Notification operations
  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const [notification] = await db
      .insert(notifications)
      .values(insertNotification)
      .returning();
    return notification;
  }

  async getUserNotifications(userId: string, limit: number = 50, offset: number = 0): Promise<Notification[]> {
    const safeLimit = !limit || isNaN(limit) || limit < 1 ? 50 : Math.min(limit, 100);
    const safeOffset = !offset || isNaN(offset) || offset < 0 ? 0 : offset;

    const results = await db
      .select({
        id: notifications.id,
        userId: notifications.userId,
        recurringScanId: notifications.recurringScanId,
        scanId: notifications.scanId,
        type: notifications.type,
        title: notifications.title,
        message: notifications.message,
        changes: notifications.changes,
        isRead: notifications.isRead,
        createdAt: notifications.createdAt,
      })
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(safeLimit)
      .offset(safeOffset);
    
    // Convert Date to ISO string for JSON serialization
    return results.map(row => ({
      ...row,
      createdAt: row.createdAt.toISOString() as any,
    }));
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const result = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false)
        )
      );
    return result.length;
  }

  async markNotificationAsRead(id: number): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id));
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, userId));
  }

  // Achievement operations
  async getAchievementByKey(key: string): Promise<Achievement | undefined> {
    const [achievement] = await db.select().from(achievements).where(eq(achievements.key, key));
    return achievement;
  }

  async createAchievement(data: any): Promise<Achievement> {
    const [achievement] = await db.insert(achievements).values(data).onConflictDoNothing().returning();
    return achievement;
  }

  async unlockAchievement(userId: string, achievementKey: string): Promise<{ unlocked: boolean, achievement?: Achievement }> {
    const achievement = await this.getAchievementByKey(achievementKey);
    if (!achievement) return { unlocked: false };

    // Try to insert the achievement (will fail silently if duplicate)
    const [inserted] = await db.insert(userAchievements)
      .values({
        userId,
        achievementId: achievement.id
      })
      .onConflictDoNothing()
      .returning();

    // If no row was inserted, it means it was already unlocked
    if (!inserted) return { unlocked: false };

    // Award XP for the achievement
    const user = await this.getUser(userId);
    if (user) {
      const newXp = (user.xp || 0) + achievement.xpReward;
      const newLevel = Math.floor(Math.sqrt(newXp / 100)) + 1;
      await this.updateUserGamificationStats(userId, newXp, newLevel);
    }

    return { unlocked: true, achievement };
  }

  async getUserAchievements(userId: string): Promise<Array<{
    id: number;
    userId: string;
    achievementId: number;
    unlockedAt: Date | null;
    achievementKey: string;
    achievementName: string;
    achievementDescription: string;
    xpReward: number;
    icon: string;
  }>> {
    const results = await db
      .select()
      .from(userAchievements)
      .innerJoin(achievements, eq(userAchievements.achievementId, achievements.id))
      .where(eq(userAchievements.userId, userId));
    
    // Map to camelCase for frontend compatibility
    return results.map(row => ({
      id: row.user_achievements.id,
      userId: row.user_achievements.userId,
      achievementId: row.user_achievements.achievementId,
      unlockedAt: row.user_achievements.unlockedAt,
      achievementKey: row.achievements.key,
      achievementName: row.achievements.name,
      achievementDescription: row.achievements.description,
      xpReward: row.achievements.xpReward,
      icon: row.achievements.icon,
    }));
  }

  // Premium LLMs Field operations
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
}

export const storage = new DatabaseStorage();
