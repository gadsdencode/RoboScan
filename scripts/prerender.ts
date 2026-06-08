import { createServer, type Server } from "node:http";
import { mkdir, writeFile, copyFile, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer, { type Page } from "puppeteer";
import sirv from "sirv";
import { PRERENDER_PATHS } from "../client/src/lib/seo/prerender";
import { PRERENDER_READY_SELECTOR } from "../client/src/hooks/usePrerenderReady";
import { getSeoMetadataByPath } from "../client/src/lib/seo/dynamic";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.resolve(__dirname, "../dist/public");
const PREVIEW_PORT = 4173;
const PREVIEW_ORIGIN = `http://127.0.0.1:${PREVIEW_PORT}`;

function outputFileForRoute(route: string): string {
  if (route === "/") {
    return path.join(DIST_DIR, "index.html");
  }

  const relative = route.replace(/^\//, "");
  return path.join(DIST_DIR, relative, "index.html");
}

function mockApiResponse(url: string): { status: number; body: string } | null {
  if (url.includes("/api/auth/user")) {
    return { status: 401, body: "{}" };
  }

  if (url.includes("/api/subscriptions/plans")) {
    return { status: 200, body: JSON.stringify({ plans: [] }) };
  }

  if (url.includes("/api/subscriptions/current")) {
    return {
      status: 200,
      body: JSON.stringify({
        subscription: null,
        plan: null,
        hasActiveSubscription: false,
      }),
    };
  }

  if (url.includes("/api/")) {
    return { status: 404, body: '{"message":"Not found"}' };
  }

  return null;
}

const SHELL_FILE = "_prerender-shell.html";

async function startPreviewServer(): Promise<Server> {
  const shellPath = path.join(DIST_DIR, SHELL_FILE);
  await copyFile(path.join(DIST_DIR, "index.html"), shellPath);

  const serve = sirv(DIST_DIR, { dev: true, single: false });

  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      serve(req, res, () => {
        if (req.method === "GET" || req.method === "HEAD") {
          req.url = `/${SHELL_FILE}`;
          serve(req, res, () => {
            res.statusCode = 404;
            res.end("Not found");
          });
          return;
        }

        res.statusCode = 404;
        res.end("Not found");
      });
    });

    server.on("error", reject);
    server.listen(PREVIEW_PORT, "127.0.0.1", () => resolve(server));
  });
}

async function prerenderRoute(page: Page, route: string): Promise<void> {
  const url =
    route === "/"
      ? `${PREVIEW_ORIGIN}/?prerender=1`
      : `${PREVIEW_ORIGIN}${route}`;

  await page.goto(url, { waitUntil: "load", timeout: 60_000 });

  const expectedTitle = getSeoMetadataByPath(route)?.title;

  await page.waitForSelector(PRERENDER_READY_SELECTOR, { timeout: 45_000 });

  if (expectedTitle) {
    await page.waitForFunction(
      (title) => document.title === title,
      { timeout: 15_000 },
      expectedTitle,
    );
  }

  const html = await page.content();
  const outputPath = outputFileForRoute(route);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, html, "utf8");

  console.log(`  ✓ ${route} → ${path.relative(DIST_DIR, outputPath)}`);
}

async function main() {
  console.log(`Prerendering ${PRERENDER_PATHS.length} public routes…`);

  const server = await startPreviewServer();
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setRequestInterception(true);

    page.on("request", (request) => {
      const mock = mockApiResponse(request.url());
      if (mock) {
        request.respond({
          status: mock.status,
          contentType: "application/json",
          body: mock.body,
        });
        return;
      }

      request.continue();
    });

    for (const route of PRERENDER_PATHS) {
      await prerenderRoute(page, route);
    }

    console.log("Prerender complete.");
  } finally {
    await browser.close();
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    await unlink(path.join(DIST_DIR, SHELL_FILE)).catch(() => undefined);
  }
}

main().catch((error) => {
  console.error("Prerender failed:", error);
  process.exit(1);
});
