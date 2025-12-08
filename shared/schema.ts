import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, timestamp, boolean, jsonb, integer, decimal, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table - compatible with both Replit Auth and NextAuth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// NextAuth.js tables
export const accounts = pgTable("accounts", {
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type").notNull(),
  provider: varchar("provider").notNull(),
  providerAccountId: varchar("provider_account_id").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: varchar("token_type"),
  scope: varchar("scope"),
  id_token: text("id_token"),
  session_state: varchar("session_state"),
}, (table) => [
  uniqueIndex("provider_account_unique").on(table.provider, table.providerAccountId)
]);

export const verificationTokens = pgTable("verification_tokens", {
  identifier: varchar("identifier").notNull(),
  token: varchar("token").notNull(),
  expires: timestamp("expires").notNull(),
}, (table) => [
  uniqueIndex("identifier_token_unique").on(table.identifier, table.token)
]);

// User storage table for Replit Auth
// Reference: blueprint:javascript_log_in_with_replit
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  
  // Stripe customer ID for subscription management
  stripeCustomerId: varchar("stripe_customer_id").unique(),
  
  // Gamification columns
  xp: integer("xp").notNull().default(0),
  level: integer("level").notNull().default(1),
  
  // Admin flag for god mode (bypasses all purchase requirements)
  isAdmin: boolean("is_admin").notNull().default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export const scans = pgTable("scans", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  url: text("url").notNull(),
  robotsTxtFound: boolean("robots_txt_found").notNull(),
  robotsTxtContent: text("robots_txt_content"),
  llmsTxtFound: boolean("llms_txt_found").notNull(),
  llmsTxtContent: text("llms_txt_content"),
  botPermissions: jsonb("bot_permissions").$type<Record<string, string>>(),
  errors: jsonb("errors").$type<string[]>(),
  warnings: jsonb("warnings").$type<string[]>(),
  tags: text("tags").array().default(sql`'{}'::text[]`),
  score: integer("score").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertScanSchema = createInsertSchema(scans).omit({
  id: true,
  createdAt: true,
});

export type InsertScan = z.infer<typeof insertScanSchema>;
export type Scan = typeof scans.$inferSelect;

export const purchases = pgTable("purchases", {
  id: serial("id").primaryKey(),
  scanId: integer("scan_id").notNull().references(() => scans.id),
  stripePaymentIntentId: text("stripe_payment_intent_id").notNull().unique(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("usd"),
  status: text("status").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPurchaseSchema = createInsertSchema(purchases).omit({
  id: true,
  createdAt: true,
});

export type InsertPurchase = z.infer<typeof insertPurchaseSchema>;
export type Purchase = typeof purchases.$inferSelect;

// Recurring scans configuration
export const recurringScans = pgTable("recurring_scans", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  url: text("url").notNull(),
  frequency: text("frequency").notNull(), // 'daily', 'weekly', 'monthly'
  isActive: boolean("is_active").notNull().default(true),
  lastScanId: integer("last_scan_id").references(() => scans.id),
  lastRunAt: timestamp("last_run_at"),
  nextRunAt: timestamp("next_run_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertRecurringScanSchema = createInsertSchema(recurringScans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertRecurringScan = z.infer<typeof insertRecurringScanSchema>;
export type RecurringScan = typeof recurringScans.$inferSelect;

// Notification preferences for recurring scans
export const notificationPreferences = pgTable("notification_preferences", {
  id: serial("id").primaryKey(),
  recurringScanId: integer("recurring_scan_id").notNull().references(() => recurringScans.id),
  notifyOnRobotsTxtChange: boolean("notify_on_robots_txt_change").notNull().default(true),
  notifyOnLlmsTxtChange: boolean("notify_on_llms_txt_change").notNull().default(true),
  notifyOnBotPermissionChange: boolean("notify_on_bot_permission_change").notNull().default(true),
  notifyOnNewErrors: boolean("notify_on_new_errors").notNull().default(true),
  notificationMethod: text("notification_method").notNull().default("in-app"), // 'in-app', 'email', 'both'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertNotificationPreferenceSchema = createInsertSchema(notificationPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertNotificationPreference = z.infer<typeof insertNotificationPreferenceSchema>;
export type NotificationPreference = typeof notificationPreferences.$inferSelect;

// Notifications table to store change alerts
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  recurringScanId: integer("recurring_scan_id").references(() => recurringScans.id),
  scanId: integer("scan_id").references(() => scans.id),
  type: text("type").notNull(), // 'robots_txt_change', 'llms_txt_change', 'bot_permission_change', 'new_errors'
  title: text("title").notNull(),
  message: text("message").notNull(),
  changes: jsonb("changes").$type<Record<string, any>>(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// Gamification: Achievements System
export const achievements = pgTable("achievements", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  xpReward: integer("xp_reward").notNull(),
  icon: text("icon").notNull(),
});

export const userAchievements = pgTable("user_achievements", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  achievementId: integer("achievement_id").notNull().references(() => achievements.id),
  unlockedAt: timestamp("unlocked_at").defaultNow(),
}, (table) => [
  uniqueIndex("user_achievement_unique").on(table.userId, table.achievementId)
]);

export type Achievement = typeof achievements.$inferSelect;
export type UserAchievement = typeof userAchievements.$inferSelect;

// Premium LLMs.txt Fields Purchases
export const llmsFieldPurchases = pgTable("llms_field_purchases", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  fieldKey: text("field_key").notNull(), // PRODUCTS, PRICING, etc.
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  amount: integer("amount").notNull(), // in cents
  purchasedAt: timestamp("purchased_at").defaultNow(),
}, (table) => [
  uniqueIndex("user_field_unique").on(table.userId, table.fieldKey)
]);

export const insertLlmsFieldPurchaseSchema = createInsertSchema(llmsFieldPurchases).omit({
  id: true,
  purchasedAt: true,
});

export type InsertLlmsFieldPurchase = z.infer<typeof insertLlmsFieldPurchaseSchema>;
export type LlmsFieldPurchase = typeof llmsFieldPurchases.$inferSelect;

// Premium Robots.txt Fields Purchases
export const robotsFieldPurchases = pgTable("robots_field_purchases", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  fieldKey: text("field_key").notNull(), // ADVANCED_CRAWL_DELAY, SITEMAP_RULES, etc.
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  amount: integer("amount").notNull(), // in cents
  purchasedAt: timestamp("purchased_at").defaultNow(),
}, (table) => [
  uniqueIndex("user_robots_field_unique").on(table.userId, table.fieldKey)
]);

export const insertRobotsFieldPurchaseSchema = createInsertSchema(robotsFieldPurchases).omit({
  id: true,
  purchasedAt: true,
});

export type InsertRobotsFieldPurchase = z.infer<typeof insertRobotsFieldPurchaseSchema>;
export type RobotsFieldPurchase = typeof robotsFieldPurchases.$inferSelect;

export const userDomainCooldowns = pgTable("user_domain_cooldowns", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  domain: text("domain").notNull(),
  lastScanAt: timestamp("last_scan_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("user_domain_cooldown_unique").on(table.userId, table.domain)
]);

export const insertUserDomainCooldownSchema = createInsertSchema(userDomainCooldowns).omit({
  id: true,
  lastScanAt: true,
});

export type InsertUserDomainCooldown = z.infer<typeof insertUserDomainCooldownSchema>;
export type UserDomainCooldown = typeof userDomainCooldowns.$inferSelect;

// Subscriptions table for Stripe subscription management
export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  stripeSubscriptionId: varchar("stripe_subscription_id").notNull().unique(),
  stripePriceId: varchar("stripe_price_id").notNull(),
  stripeProductId: varchar("stripe_product_id"),
  status: varchar("status").notNull(), // 'active', 'canceled', 'past_due', 'trialing', 'incomplete', 'paused'
  
  // Billing cycle info
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  canceledAt: timestamp("canceled_at"),
  
  // Trial info
  trialStart: timestamp("trial_start"),
  trialEnd: timestamp("trial_end"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("subscription_user_idx").on(table.userId),
  index("subscription_stripe_id_idx").on(table.stripeSubscriptionId),
]);

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptions.$inferSelect;

// Subscription events log for webhook tracking/auditing
export const subscriptionEvents = pgTable("subscription_events", {
  id: serial("id").primaryKey(),
  subscriptionId: integer("subscription_id").references(() => subscriptions.id),
  stripeEventId: varchar("stripe_event_id").notNull().unique(),
  eventType: varchar("event_type").notNull(), // 'invoice.paid', 'customer.subscription.updated', etc.
  eventData: jsonb("event_data").$type<Record<string, any>>(),
  processedAt: timestamp("processed_at").defaultNow().notNull(),
});

export const insertSubscriptionEventSchema = createInsertSchema(subscriptionEvents).omit({
  id: true,
  processedAt: true,
});

export type InsertSubscriptionEvent = z.infer<typeof insertSubscriptionEventSchema>;
export type SubscriptionEvent = typeof subscriptionEvents.$inferSelect;

// Subscription plans configuration (optional: for displaying plan info)
export const subscriptionPlans = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  stripePriceId: varchar("stripe_price_id").notNull().unique(),
  stripeProductId: varchar("stripe_product_id").notNull(),
  name: varchar("name").notNull(),
  description: text("description"),
  amount: integer("amount").notNull(), // in cents
  currency: varchar("currency").notNull().default("usd"),
  interval: varchar("interval").notNull(), // 'month', 'year'
  intervalCount: integer("interval_count").notNull().default(1),
  features: jsonb("features").$type<string[]>().default(sql`'[]'::jsonb`),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
