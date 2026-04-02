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
import { eq, desc, and, sql, gte, count, max } from "drizzle-orm";

function countScanFileCoverage(s: Scan): number {
  let n = 0;
  if (s.robotsTxtFound) n++;
  if (s.llmsTxtFound) n++;
  if (s.sitemapXmlFound) n++;
  if (s.securityTxtFound) n++;
  if (s.manifestJsonFound) n++;
  if (s.adsTxtFound) n++;
  if (s.humansTxtFound) n++;
  if (s.aiTxtFound) n++;
  return n;
}

export interface IScanStore {
  // Scan operations
  createScan(scan: InsertScan): Promise<Scan>;
  getScan(id: number): Promise<Scan | undefined>;
  getUserScans(userId: string, tagFilter?: string[], limit?: number, offset?: number): Promise<Scan[]>;
  getScanById(scanId: number, userId: string): Promise<Scan | null>;
  updateScanTags(id: number, tags: string[]): Promise<Scan>;
  getAllUserTags(userId: string): Promise<string[]>;

  /** Total scans owned by the user (for gamification milestones). */
  countUserScans(userId: string): Promise<number>;

  /** Scans with createdAt >= since (rolling window checks). */
  countUserScansSince(userId: string, since: Date): Promise<number>;

  /** Highest scan score for user (for achievement progress). */
  getMaxScanScoreForUser(userId: string): Promise<number | null>;

  /** Max count of detected file-type flags (0–8) across user's scans. */
  getMaxFileCoverageForUser(userId: string): Promise<number>;
  
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

  async countUserScans(userId: string): Promise<number> {
    const [row] = await db
      .select({ value: count() })
      .from(scans)
      .where(eq(scans.userId, userId));
    return Number(row?.value ?? 0);
  }

  async countUserScansSince(userId: string, since: Date): Promise<number> {
    const [row] = await db
      .select({ value: count() })
      .from(scans)
      .where(and(eq(scans.userId, userId), gte(scans.createdAt, since)));
    return Number(row?.value ?? 0);
  }

  async getMaxScanScoreForUser(userId: string): Promise<number | null> {
    const [row] = await db
      .select({ value: max(scans.score) })
      .from(scans)
      .where(eq(scans.userId, userId));
    const v = row?.value;
    return v === null || v === undefined ? null : Number(v);
  }

  async getMaxFileCoverageForUser(userId: string): Promise<number> {
    const rows = await db
      .select()
      .from(scans)
      .where(eq(scans.userId, userId))
      .limit(100);

    let maxCov = 0;
    for (const s of rows) {
      const c = countScanFileCoverage(s);
      if (c > maxCov) maxCov = c;
    }
    return maxCov;
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
