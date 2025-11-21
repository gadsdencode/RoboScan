// Reference: blueprint:javascript_log_in_with_replit
import {
  users,
  scans,
  purchases,
  recurringScans,
  notificationPreferences,
  notifications,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, lte, arrayContains, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Scan operations
  createScan(scan: InsertScan): Promise<Scan>;
  getScan(id: number): Promise<Scan | undefined>;
  getUserScans(userId: string, tagFilter?: string[]): Promise<Scan[]>;
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
  getUserNotifications(userId: string, limit?: number): Promise<Notification[]>;
  getUnreadNotificationCount(userId: string): Promise<number>;
  markNotificationAsRead(id: number): Promise<void>;
  markAllNotificationsAsRead(userId: string): Promise<void>;
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

  async createScan(insertScan: InsertScan): Promise<Scan> {
    const [scan] = await db.insert(scans).values(insertScan).returning();
    return scan;
  }

  async getScan(id: number): Promise<Scan | undefined> {
    const [scan] = await db.select().from(scans).where(eq(scans.id, id));
    return scan;
  }

  async getUserScans(userId: string, tagFilter?: string[]): Promise<Scan[]> {
    let query = db
      .select()
      .from(scans)
      .where(eq(scans.userId, userId));

    if (tagFilter && tagFilter.length > 0) {
      query = query.where(
        and(
          eq(scans.userId, userId),
          sql`${scans.tags} && ${tagFilter}`
        )
      );
    }

    return await query.orderBy(desc(scans.createdAt));
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

  async getUserNotifications(userId: string, limit: number = 50): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
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
}

export const storage = new DatabaseStorage();
