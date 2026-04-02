// server/controllers/seoController.ts
// Handles SEO-related routes like sitemap generation

import { Router, Request, Response } from "express";

const router = Router();

/**
 * GET /sitemap.xml
 * Generate XML sitemap for SEO
 */
router.get('/sitemap.xml', (req: Request, res: Response) => {
  const baseUrl = "https://" + req.get("host");
  
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/tools/llms-builder</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>`;

  res.header("Content-Type", "application/xml");
  res.send(xml);
});

export default router;
