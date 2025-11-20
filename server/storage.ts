import { type User, type InsertUser, type Scan, type InsertScan, type Purchase, type InsertPurchase } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createScan(scan: InsertScan): Promise<Scan>;
  getScan(id: number): Promise<Scan | undefined>;
  createPurchase(purchase: InsertPurchase): Promise<Purchase>;
  getPurchaseByScanId(scanId: number): Promise<Purchase | undefined>;
  getPurchaseByPaymentIntent(paymentIntentId: string): Promise<Purchase | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private scans: Map<number, Scan>;
  private purchases: Map<number, Purchase>;
  private scanIdCounter: number;
  private purchaseIdCounter: number;

  constructor() {
    this.users = new Map();
    this.scans = new Map();
    this.purchases = new Map();
    this.scanIdCounter = 1;
    this.purchaseIdCounter = 1;
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createScan(insertScan: InsertScan): Promise<Scan> {
    const id = this.scanIdCounter++;
    const scan: Scan = {
      id,
      url: insertScan.url,
      robotsTxtFound: insertScan.robotsTxtFound,
      robotsTxtContent: insertScan.robotsTxtContent ?? null,
      llmsTxtFound: insertScan.llmsTxtFound,
      llmsTxtContent: insertScan.llmsTxtContent ?? null,
      botPermissions: insertScan.botPermissions ?? null,
      errors: insertScan.errors ? [...insertScan.errors] : null,
      warnings: insertScan.warnings ? [...insertScan.warnings] : null,
      createdAt: new Date(),
    };
    this.scans.set(id, scan);
    return scan;
  }

  async getScan(id: number): Promise<Scan | undefined> {
    return this.scans.get(id);
  }

  async createPurchase(insertPurchase: InsertPurchase): Promise<Purchase> {
    const id = this.purchaseIdCounter++;
    const purchase: Purchase = {
      id,
      scanId: insertPurchase.scanId,
      stripePaymentIntentId: insertPurchase.stripePaymentIntentId,
      amount: insertPurchase.amount,
      currency: insertPurchase.currency ?? "usd",
      status: insertPurchase.status,
      createdAt: new Date(),
    };
    this.purchases.set(id, purchase);
    return purchase;
  }

  async getPurchaseByScanId(scanId: number): Promise<Purchase | undefined> {
    return Array.from(this.purchases.values()).find(
      (purchase) => purchase.scanId === scanId && purchase.status === 'succeeded'
    );
  }

  async getPurchaseByPaymentIntent(paymentIntentId: string): Promise<Purchase | undefined> {
    return Array.from(this.purchases.values()).find(
      (purchase) => purchase.stripePaymentIntentId === paymentIntentId
    );
  }
}

export const storage = new MemStorage();
