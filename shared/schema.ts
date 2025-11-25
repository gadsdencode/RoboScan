import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, timestamp, boolean, jsonb, integer, decimal, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
// Reference: blueprint:javascript_log_in_with_replit
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
// Reference: blueprint:javascript_log_in_with_replit
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  
  // Gamification columns
  xp: integer("xp").notNull().default(0),
  level: integer("level").notNull().default(1),
  
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
