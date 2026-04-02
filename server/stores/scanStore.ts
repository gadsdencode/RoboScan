// server/stores/scanStore.ts
// Handles scan CRUD, scan jobs (async scanning), and tag operations

import {
  scans,
  scanJobs,
  type Scan,
  type InsertScan,
  type ScanJob,
  type InsertScanJob,
  type ScanJobStatus,
} from "../../shared/schema.js";
import { db } from "../db.js";
import { eq, desc, and, sql } from "drizzle-orm";

export interface IScanStore {
  // Scan operations
  createScan(scan: InsertScan): Promise<Scan>;
  getScan(id: number): Promise<Scan | undefined>;
  getUserScans(userId: string, tagFilter?: string[], limit?: number, offset?: number): Promise<Scan[]>;
  getScanById(scanId: number, userId: string): Promise<Scan | null>;
  updateScanTags(id: number, tags: string[]): Promise<Scan>;
  getAllUserTags(userId: string): Promise<string[]>;
  
  // Score percentile operations
  getScorePercentile(score: number): Promise<number>;
  
  // Scan job operations (async scanning with QStash)
  createScanJob(job: InsertScanJob): Promise<ScanJob>;
  getScanJob(id: string): Promise<ScanJob | undefined>;
  updateScanJob(id: string, data: Partial<InsertScanJob>): Promise<ScanJob>;
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
  ): Promise<ScanJob>;
}

export class ScanStore implements IScanStore {
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

  async getScorePercentile(score: number): Promise<number> {
    // Count scans with a lower score
    const [lowerResult] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(scans)
      .where(sql`${scans.score} < ${score}`);
    
    // Count total scans
    const [totalResult] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(scans);

    const totalCount = Number(totalResult.count);
    if (totalCount === 0) return 100;

    // Calculate percentile: (Scans Lower / Total Scans) * 100
    return Math.round((Number(lowerResult.count) / totalCount) * 100);
  }

  // ============== Scan Job Operations (Async Scanning) ==============

  async createScanJob(job: InsertScanJob): Promise<ScanJob> {
    const [created] = await db
      .insert(scanJobs)
      .values(job)
      .returning();
    return created;
  }

  async getScanJob(id: string): Promise<ScanJob | undefined> {
    const [job] = await db
      .select()
      .from(scanJobs)
      .where(eq(scanJobs.id, id));
    return job;
  }

  async updateScanJob(id: string, data: Partial<InsertScanJob>): Promise<ScanJob> {
    const [updated] = await db
      .update(scanJobs)
      .set(data)
      .where(eq(scanJobs.id, id))
      .returning();
    
    if (!updated) throw new Error("Scan job not found");
    return updated;
  }

  async updateScanJobStatus(
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
    const updateData: Record<string, unknown> = { status };

    if (status === 'processing') {
      updateData.startedAt = new Date();
    } else if (status === 'completed' || status === 'failed') {
      updateData.completedAt = new Date();
    }

    if (data?.scanId !== undefined) updateData.scanId = data.scanId;
    if (data?.error !== undefined) updateData.error = data.error;
    if (data?.progress !== undefined) updateData.progress = data.progress;
    if (data?.progressMessage !== undefined) updateData.progressMessage = data.progressMessage;
    if (data?.qstashMessageId !== undefined) updateData.qstashMessageId = data.qstashMessageId;

    const [updated] = await db
      .update(scanJobs)
      .set(updateData)
      .where(eq(scanJobs.id, id))
      .returning();

    if (!updated) throw new Error("Scan job not found");
    return updated;
  }
}

export const scanStore = new ScanStore();
