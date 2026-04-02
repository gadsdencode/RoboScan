// server/stores/index.ts
// Facade that aggregates all domain-specific stores and provides backward-compatible IStorage interface

import { userStore, type IUserStore } from "./userStore.js";
import { scanStore, type IScanStore } from "./scanStore.js";
import { billingStore, type IBillingStore } from "./billingStore.js";
import { notificationStore, type INotificationStore } from "./notificationStore.js";
import { fieldPurchaseStore, type IFieldPurchaseStore } from "./fieldPurchaseStore.js";

import type {
  User,
  UpsertUser,
  Scan,
  InsertScan,
  Purchase,
  InsertPurchase,
  RecurringScan,
  InsertRecurringScan,
  NotificationPreference,
  InsertNotificationPreference,
  Notification,
  InsertNotification,
  Achievement,
  LlmsFieldPurchase,
  InsertLlmsFieldPurchase,
  RobotsFieldPurchase,
  InsertRobotsFieldPurchase,
  Subscription,
  InsertSubscription,
  SubscriptionEvent,
  InsertSubscriptionEvent,
  SubscriptionPlan,
  InsertSubscriptionPlan,
  PromotionalCode,
  InsertPromotionalCode,
  PromotionalCodeRedemption,
  InsertPromotionalCodeRedemption,
  ScanJob,
  InsertScanJob,
  ScanJobStatus,
} from "../../shared/schema.js";

/**
 * Unified IStorage interface for backward compatibility
 * This interface aggregates all domain-specific store methods
 */
export interface IStorage extends 
  IUserStore, 
  IScanStore, 
  IBillingStore, 
  INotificationStore, 
  IFieldPurchaseStore {
  // Unified access control helpers (depend on multiple stores)
  hasReportAccess(userId: string, scanId: number): Promise<{ hasAccess: boolean; reason: 'subscription' | 'purchase' | 'none' }>;
  hasLlmsFieldAccess(userId: string, fieldKey: string): Promise<{ hasAccess: boolean; reason: 'subscription' | 'purchase' | 'none' }>;
  hasRobotsFieldAccess(userId: string, fieldKey: string): Promise<{ hasAccess: boolean; reason: 'subscription' | 'purchase' | 'none' }>;
  hasRecurringScanAccess(userId: string): Promise<boolean>;
}

/**
 * DatabaseStorage facade that delegates to domain-specific stores
 * Provides backward-compatible interface while using modular stores internally
 */
export class DatabaseStorage implements IStorage {
  // ============== User Operations (delegated to UserStore) ==============
  
  getUser(id: string): Promise<User | undefined> {
    return userStore.getUser(id);
  }
  
  upsertUser(user: UpsertUser): Promise<User> {
    return userStore.upsertUser(user);
  }
  
  updateUserGamificationStats(userId: string, xp: number, level: number): Promise<User> {
    return userStore.updateUserGamificationStats(userId, xp, level);
  }

  incrementUserXpByDelta(userId: string, deltaXp: number): Promise<User> {
    return userStore.incrementUserXpByDelta(userId, deltaXp);
  }

  awardScanXpWithCooldown(
    userId: string,
    domain: string,
    xpDelta: number,
    cooldownHours?: number
  ) {
    return userStore.awardScanXpWithCooldown(userId, domain, xpDelta, cooldownHours);
  }
  
  updateUserPassword(userId: string, passwordHash: string): Promise<User> {
    return userStore.updateUserPassword(userId, passwordHash);
  }
  
  updateUserStripeCustomerId(userId: string, stripeCustomerId: string): Promise<User> {
    return userStore.updateUserStripeCustomerId(userId, stripeCustomerId);
  }
  
  getUserByStripeCustomerId(stripeCustomerId: string): Promise<User | undefined> {
    return userStore.getUserByStripeCustomerId(stripeCustomerId);
  }
  
  // ============== Scan Operations (delegated to ScanStore) ==============
  
  createScan(scan: InsertScan): Promise<Scan> {
    return scanStore.createScan(scan);
  }
  
  getScan(id: number): Promise<Scan | undefined> {
    return scanStore.getScan(id);
  }
  
  getUserScans(userId: string, tagFilter?: string[], limit?: number, offset?: number): Promise<Scan[]> {
    return scanStore.getUserScans(userId, tagFilter, limit, offset);
  }

  countUserScans(userId: string): Promise<number> {
    return scanStore.countUserScans(userId);
  }

  countUserScansSince(userId: string, since: Date): Promise<number> {
    return scanStore.countUserScansSince(userId, since);
  }

  countUserScansWithSecurityTxt(userId: string): Promise<number> {
    return scanStore.countUserScansWithSecurityTxt(userId);
  }

  getMaxScanScoreForUser(userId: string): Promise<number | null> {
    return scanStore.getMaxScanScoreForUser(userId);
  }

  getMaxFileCoverageForUser(userId: string): Promise<number> {
    return scanStore.getMaxFileCoverageForUser(userId);
  }
  
  getScanById(scanId: number, userId: string): Promise<Scan | null> {
    return scanStore.getScanById(scanId, userId);
  }
  
  updateScanTags(id: number, tags: string[]): Promise<Scan> {
    return scanStore.updateScanTags(id, tags);
  }
  
  getAllUserTags(userId: string): Promise<string[]> {
    return scanStore.getAllUserTags(userId);
  }
  
  getScorePercentile(score: number): Promise<number> {
    return scanStore.getScorePercentile(score);
  }
  
  // Scan job operations
  createScanJob(job: InsertScanJob): Promise<ScanJob> {
    return scanStore.createScanJob(job);
  }
  
  getScanJob(id: string): Promise<ScanJob | undefined> {
    return scanStore.getScanJob(id);
  }
  
  updateScanJob(id: string, data: Partial<InsertScanJob>): Promise<ScanJob> {
    return scanStore.updateScanJob(id, data);
  }
  
  updateScanJobStatus(
    id: string,
    status: ScanJobStatus,
    data?: {
      scanId?: number;
      error?: string;
      progress?: number;
      progressMessage?: string;
      qstashMessageId?: string;
    }
  ): Promise<ScanJob> {
    return scanStore.updateScanJobStatus(id, status, data);
  }
  
  // ============== Billing Operations (delegated to BillingStore) ==============
  
  createPurchase(purchase: InsertPurchase): Promise<Purchase> {
    return billingStore.createPurchase(purchase);
  }
  
  getPurchaseByScanId(scanId: number): Promise<Purchase | undefined> {
    return billingStore.getPurchaseByScanId(scanId);
  }
  
  getPurchaseByPaymentIntent(paymentIntentId: string): Promise<Purchase | undefined> {
    return billingStore.getPurchaseByPaymentIntent(paymentIntentId);
  }

  getUserHasScanPurchase(userId: string): Promise<boolean> {
    return billingStore.getUserHasScanPurchase(userId);
  }
  
  createSubscription(subscription: InsertSubscription): Promise<Subscription> {
    return billingStore.createSubscription(subscription);
  }
  
  getSubscription(id: number): Promise<Subscription | undefined> {
    return billingStore.getSubscription(id);
  }
  
  getSubscriptionByStripeId(stripeSubscriptionId: string): Promise<Subscription | undefined> {
    return billingStore.getSubscriptionByStripeId(stripeSubscriptionId);
  }
  
  getUserSubscriptions(userId: string): Promise<Subscription[]> {
    return billingStore.getUserSubscriptions(userId);
  }
  
  getUserActiveSubscription(userId: string): Promise<Subscription | undefined> {
    return billingStore.getUserActiveSubscription(userId);
  }
  
  updateSubscription(stripeSubscriptionId: string, data: Partial<InsertSubscription>): Promise<Subscription> {
    return billingStore.updateSubscription(stripeSubscriptionId, data);
  }
  
  createSubscriptionEvent(event: InsertSubscriptionEvent): Promise<SubscriptionEvent> {
    return billingStore.createSubscriptionEvent(event);
  }
  
  getSubscriptionEventByStripeId(stripeEventId: string): Promise<SubscriptionEvent | undefined> {
    return billingStore.getSubscriptionEventByStripeId(stripeEventId);
  }
  
  createSubscriptionPlan(plan: InsertSubscriptionPlan): Promise<SubscriptionPlan> {
    return billingStore.createSubscriptionPlan(plan);
  }
  
  getSubscriptionPlans(activeOnly?: boolean): Promise<SubscriptionPlan[]> {
    return billingStore.getSubscriptionPlans(activeOnly);
  }
  
  getSubscriptionPlanByPriceId(stripePriceId: string): Promise<SubscriptionPlan | undefined> {
    return billingStore.getSubscriptionPlanByPriceId(stripePriceId);
  }
  
  updateSubscriptionPlan(id: number, data: Partial<InsertSubscriptionPlan>): Promise<SubscriptionPlan> {
    return billingStore.updateSubscriptionPlan(id, data);
  }
  
  getPromotionalCode(code: string): Promise<PromotionalCode | undefined> {
    return billingStore.getPromotionalCode(code);
  }
  
  createPromotionalCode(code: InsertPromotionalCode): Promise<PromotionalCode> {
    return billingStore.createPromotionalCode(code);
  }
  
  getPromotionalCodeRedemptionCount(codeId: number): Promise<number> {
    return billingStore.getPromotionalCodeRedemptionCount(codeId);
  }
  
  createPromotionalCodeRedemption(redemption: InsertPromotionalCodeRedemption): Promise<PromotionalCodeRedemption> {
    return billingStore.createPromotionalCodeRedemption(redemption);
  }
  
  getUserPromotionalCodeRedemptions(userId: string): Promise<PromotionalCodeRedemption[]> {
    return billingStore.getUserPromotionalCodeRedemptions(userId);
  }
  
  // ============== Notification Operations (delegated to NotificationStore) ==============
  
  createRecurringScan(recurringScan: InsertRecurringScan): Promise<RecurringScan> {
    return notificationStore.createRecurringScan(recurringScan);
  }
  
  getRecurringScan(id: number): Promise<RecurringScan | undefined> {
    return notificationStore.getRecurringScan(id);
  }
  
  getUserRecurringScans(userId: string): Promise<RecurringScan[]> {
    return notificationStore.getUserRecurringScans(userId);
  }
  
  updateRecurringScan(id: number, data: Partial<InsertRecurringScan>): Promise<RecurringScan> {
    return notificationStore.updateRecurringScan(id, data);
  }
  
  deleteRecurringScan(id: number): Promise<void> {
    return notificationStore.deleteRecurringScan(id);
  }
  
  getDueRecurringScans(): Promise<RecurringScan[]> {
    return notificationStore.getDueRecurringScans();
  }
  
  createNotificationPreference(pref: InsertNotificationPreference): Promise<NotificationPreference> {
    return notificationStore.createNotificationPreference(pref);
  }
  
  getNotificationPreferenceByRecurringScanId(recurringScanId: number): Promise<NotificationPreference | undefined> {
    return notificationStore.getNotificationPreferenceByRecurringScanId(recurringScanId);
  }
  
  updateNotificationPreference(id: number, data: Partial<InsertNotificationPreference>): Promise<NotificationPreference> {
    return notificationStore.updateNotificationPreference(id, data);
  }
  
  createNotification(notification: InsertNotification): Promise<Notification> {
    return notificationStore.createNotification(notification);
  }
  
  getUserNotifications(userId: string, limit?: number, offset?: number): Promise<Notification[]> {
    return notificationStore.getUserNotifications(userId, limit, offset);
  }
  
  getUnreadNotificationCount(userId: string): Promise<number> {
    return notificationStore.getUnreadNotificationCount(userId);
  }
  
  markNotificationAsRead(id: number): Promise<void> {
    return notificationStore.markNotificationAsRead(id);
  }
  
  markAllNotificationsAsRead(userId: string): Promise<void> {
    return notificationStore.markAllNotificationsAsRead(userId);
  }
  
  getAchievementByKey(key: string): Promise<Achievement | undefined> {
    return notificationStore.getAchievementByKey(key);
  }
  
  unlockAchievement(userId: string, achievementKey: string): Promise<{ unlocked: boolean; achievement?: Achievement }> {
    return notificationStore.unlockAchievement(userId, achievementKey);
  }
  
  createAchievement(data: any): Promise<Achievement> {
    return notificationStore.createAchievement(data);
  }
  
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
  }>> {
    return notificationStore.getUserAchievements(userId);
  }

  getScanGamificationNotification(
    userId: string,
    scanId: number
  ): Promise<import("./notificationStore.js").ScanGamificationPayload | null> {
    return notificationStore.getScanGamificationNotification(userId, scanId);
  }

  hasBuilderValidationRecorded(userId: string, builderKey: string): Promise<boolean> {
    return notificationStore.hasBuilderValidationRecorded(userId, builderKey);
  }
  
  // ============== Field Purchase Operations (delegated to FieldPurchaseStore) ==============
  
  createLlmsFieldPurchase(purchase: InsertLlmsFieldPurchase): Promise<LlmsFieldPurchase> {
    return fieldPurchaseStore.createLlmsFieldPurchase(purchase);
  }
  
  getUserLlmsFieldPurchases(userId: string): Promise<LlmsFieldPurchase[]> {
    return fieldPurchaseStore.getUserLlmsFieldPurchases(userId);
  }
  
  hasUserPurchasedField(userId: string, fieldKey: string): Promise<boolean> {
    return fieldPurchaseStore.hasUserPurchasedField(userId, fieldKey);
  }
  
  getLlmsFieldPurchaseByPaymentIntent(paymentIntentId: string): Promise<LlmsFieldPurchase | undefined> {
    return fieldPurchaseStore.getLlmsFieldPurchaseByPaymentIntent(paymentIntentId);
  }
  
  createRobotsFieldPurchase(purchase: InsertRobotsFieldPurchase): Promise<RobotsFieldPurchase> {
    return fieldPurchaseStore.createRobotsFieldPurchase(purchase);
  }
  
  getUserRobotsFieldPurchases(userId: string): Promise<RobotsFieldPurchase[]> {
    return fieldPurchaseStore.getUserRobotsFieldPurchases(userId);
  }
  
  hasUserPurchasedRobotsField(userId: string, fieldKey: string): Promise<boolean> {
    return fieldPurchaseStore.hasUserPurchasedRobotsField(userId, fieldKey);
  }
  
  getRobotsFieldPurchaseByPaymentIntent(paymentIntentId: string): Promise<RobotsFieldPurchase | undefined> {
    return fieldPurchaseStore.getRobotsFieldPurchaseByPaymentIntent(paymentIntentId);
  }
  
  checkDomainCooldown(userId: string, domain: string): Promise<boolean> {
    return fieldPurchaseStore.checkDomainCooldown(userId, domain);
  }
  
  upsertDomainCooldown(userId: string, domain: string): Promise<void> {
    return fieldPurchaseStore.upsertDomainCooldown(userId, domain);
  }
  
  // ============== Unified Access Control Helpers ==============
  // These methods depend on multiple stores and provide unified access checking
  
  /**
   * Check if user has access to full report details for a scan
   * Access granted via: active subscription OR one-time report purchase
   */
  async hasReportAccess(userId: string, scanId: number): Promise<{ hasAccess: boolean; reason: 'subscription' | 'purchase' | 'none' }> {
    // Check subscription first (most valuable)
    const subscription = await billingStore.getUserActiveSubscription(userId);
    if (subscription) {
      return { hasAccess: true, reason: 'subscription' };
    }

    // Check one-time purchase
    const purchase = await billingStore.getPurchaseByScanId(scanId);
    if (purchase) {
      return { hasAccess: true, reason: 'purchase' };
    }

    return { hasAccess: false, reason: 'none' };
  }

  /**
   * Check if user has access to a premium LLMS field
   * Access granted via: active subscription OR field purchase
   */
  async hasLlmsFieldAccess(userId: string, fieldKey: string): Promise<{ hasAccess: boolean; reason: 'subscription' | 'purchase' | 'none' }> {
    // Check subscription first
    const subscription = await billingStore.getUserActiveSubscription(userId);
    if (subscription) {
      return { hasAccess: true, reason: 'subscription' };
    }

    // Check field purchase
    const hasPurchased = await fieldPurchaseStore.hasUserPurchasedField(userId, fieldKey);
    if (hasPurchased) {
      return { hasAccess: true, reason: 'purchase' };
    }

    return { hasAccess: false, reason: 'none' };
  }

  /**
   * Check if user has access to a premium robots field
   * Access granted via: active subscription OR field purchase
   */
  async hasRobotsFieldAccess(userId: string, fieldKey: string): Promise<{ hasAccess: boolean; reason: 'subscription' | 'purchase' | 'none' }> {
    // Check subscription first
    const subscription = await billingStore.getUserActiveSubscription(userId);
    if (subscription) {
      return { hasAccess: true, reason: 'subscription' };
    }

    // Check field purchase
    const hasPurchased = await fieldPurchaseStore.hasUserPurchasedRobotsField(userId, fieldKey);
    if (hasPurchased) {
      return { hasAccess: true, reason: 'purchase' };
    }

    return { hasAccess: false, reason: 'none' };
  }

  /**
   * Check if user has access to recurring scans feature
   * This is subscription-only (no one-time purchase option)
   */
  async hasRecurringScanAccess(userId: string): Promise<boolean> {
    const subscription = await billingStore.getUserActiveSubscription(userId);
    return !!subscription;
  }
}

// Export singleton instance for backward compatibility
export const storage = new DatabaseStorage();

// Export individual stores for direct access if needed
export { userStore, scanStore, billingStore, notificationStore, fieldPurchaseStore };
