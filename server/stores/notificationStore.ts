// server/stores/notificationStore.ts
// Handles notifications, notification preferences, recurring scans, and achievements

import {
  recurringScans,
  notificationPreferences,
  notifications,
  achievements,
  userAchievements,
  type RecurringScan,
  type InsertRecurringScan,
  type NotificationPreference,
  type InsertNotificationPreference,
  type Notification,
  type InsertNotification,
  type Achievement,
} from "../../shared/schema.js";
import { db } from "../db.js";
import { eq, desc, and, lte, sql } from "drizzle-orm";
export interface INotificationStore {
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

  /** Payload stored on notifications.changes for async scan gamification polling */
  getScanGamificationNotification(
    userId: string,
    scanId: number
  ): Promise<ScanGamificationPayload | null>;

  /** Whether user already received one-time builder validation XP for this builder key */
  hasBuilderValidationRecorded(userId: string, builderKey: string): Promise<boolean>;
}

/** Shape of `notifications.changes` for type `scan_gamification` */
export interface ScanGamificationPayload {
  gamification?: {
    xpGained: number;
    baseXp?: number;
    multiplier?: number;
    totalXp: number;
    newLevel: number;
    levelUp: boolean;
    cooldownActive?: boolean;
    isSubscriber?: boolean;
  };
  achievementsUnlocked?: Array<{ key: string; name: string; xpReward: number }>;
}

export class NotificationStore implements INotificationStore {
  // ============== Recurring Scan Operations ==============

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
    // Atomically claim due rows by advancing nextRunAt by 15 minutes before returning them.
    // If two cron invocations overlap, the second UPDATE finds next_run_at > now and
    // returns 0 rows — preventing duplicate scan execution. On successful processing,
    // processRecurringScan overwrites nextRunAt with the correct next scheduled time.
    // 15 minutes provides headroom for slow external-site fetches with no enforced timeout.
    // On failure, the claim expires naturally and the row becomes re-eligible after 15 minutes.
    const claimUntil = new Date(now.getTime() + 15 * 60 * 1000);
    return await db
      .update(recurringScans)
      .set({ nextRunAt: claimUntil, updatedAt: new Date() })
      .where(
        and(
          eq(recurringScans.isActive, true),
          lte(recurringScans.nextRunAt, now)
        )
      )
      .returning();
  }

  // ============== Notification Preference Operations ==============

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

  // ============== Notification Operations ==============

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

  // ============== Achievement Operations ==============

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

    const { applyFlatXp } = await import("../services/gamificationService.js");
    await applyFlatXp(userId, achievement.xpReward);

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

  async getScanGamificationNotification(
    userId: string,
    scanId: number
  ): Promise<ScanGamificationPayload | null> {
    const [row] = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.scanId, scanId),
          eq(notifications.type, "scan_gamification")
        )
      )
      .orderBy(desc(notifications.id))
      .limit(1);

    if (!row?.changes) {
      return null;
    }

    return row.changes as ScanGamificationPayload;
  }

  async hasBuilderValidationRecorded(
    userId: string,
    builderKey: string
  ): Promise<boolean> {
    const rows = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.type, "builder_validation"),
          sql`${notifications.changes}->>'builderKey' = ${builderKey}`
        )
      )
      .limit(1);
    return rows.length > 0;
  }
}

export const notificationStore = new NotificationStore();
