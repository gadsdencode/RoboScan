import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { scanWebsite } from "./scanner";
import { z } from "zod";

const scanRequestSchema = z.object({
  url: z.string().min(1, "URL is required"),
});

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/scan", async (req, res) => {
    try {
      const { url } = scanRequestSchema.parse(req.body);

      const result = await scanWebsite(url);

      const scan = await storage.createScan({
        url,
        robotsTxtFound: result.robotsTxtFound,
        robotsTxtContent: result.robotsTxtContent,
        llmsTxtFound: result.llmsTxtFound,
        llmsTxtContent: result.llmsTxtContent,
        botPermissions: result.botPermissions,
        errors: result.errors,
        warnings: result.warnings,
      });

      res.json({
        id: scan.id,
        url: scan.url,
        robotsTxtFound: scan.robotsTxtFound,
        robotsTxtContent: scan.robotsTxtContent,
        llmsTxtFound: scan.llmsTxtFound,
        llmsTxtContent: scan.llmsTxtContent,
        botPermissions: scan.botPermissions,
        errors: scan.errors,
        warnings: scan.warnings,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid request", 
          errors: error.errors 
        });
      }
      
      console.error('Scan error:', error);
      res.status(500).json({ 
        message: "Failed to scan website",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
