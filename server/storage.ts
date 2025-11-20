import { type User, type InsertUser, type Scan, type InsertScan } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createScan(scan: InsertScan): Promise<Scan>;
  getScan(id: number): Promise<Scan | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private scans: Map<number, Scan>;
  private scanIdCounter: number;

  constructor() {
    this.users = new Map();
    this.scans = new Map();
    this.scanIdCounter = 1;
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
}

export const storage = new MemStorage();
