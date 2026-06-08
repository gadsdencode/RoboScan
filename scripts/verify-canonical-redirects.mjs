#!/usr/bin/env node
/**
 * Verify builder canonical redirect setup for all 8 tools:
 * - vercel.json alias → /tools/<name> rules
 * - Navbar canonical hrefs
 * - optional live HTTP checks (BASE_URL env)
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const BUILDERS = [
  "llms-builder",
  "robots-builder",
  "sitemap-builder",
  "security-builder",
  "manifest-builder",
  "ads-builder",
  "humans-builder",
  "ai-builder",
];

let pass = 0;
let fail = 0;

function ok(msg) {
  console.log(`PASS  ${msg}`);
  pass += 1;
}

function bad(msg) {
  console.log(`FAIL  ${msg}`);
  fail += 1;
}

// --- Static: vercel.json ---
const vercel = JSON.parse(readFileSync(path.join(ROOT, "vercel.json"), "utf8"));
const redirectMap = new Map(
  (vercel.redirects ?? [])
    .filter((r) => r.source && r.destination && !r.source.includes(":"))
    .map((r) => [r.source, r.destination]),
);

console.log("--- vercel.json redirects ---");
for (const name of BUILDERS) {
  const alias = `/${name}`;
  const canonical = `/tools/${name}`;
  const dest = redirectMap.get(alias);
  if (dest === canonical && redirectMap.get(alias)) {
    ok(`vercel.json ${alias} → ${dest}`);
  } else {
    bad(`vercel.json ${alias} → ${dest ?? "<missing>"} (expected ${canonical})`);
  }
}

// --- Static: Navbar.tsx ---
const navbar = readFileSync(path.join(ROOT, "client/src/components/Navbar.tsx"), "utf8");
console.log("--- Navbar.tsx hrefs ---");
for (const name of BUILDERS) {
  const canonical = `/tools/${name}`;
  if (navbar.includes(`href: "${canonical}"`)) {
    ok(`Navbar href ${canonical}`);
  } else {
    bad(`Navbar missing href: "${canonical}"`);
  }
  const alias = `href: "/${name}"`;
  if (navbar.includes(alias)) {
    bad(`Navbar still has alias ${alias}`);
  }
}

// --- Live HTTP (optional) ---
const baseUrl = process.env.BASE_URL;
if (baseUrl) {
  console.log(`--- Live checks: ${baseUrl} ---`);
  for (const name of BUILDERS) {
    const aliasRes = await fetch(`${baseUrl}/${name}`, { method: "HEAD", redirect: "manual" });
    const location = aliasRes.headers.get("location") ?? "";
    if (aliasRes.status === 308 && location.includes(`/tools/${name}`)) {
      ok(`live alias /${name} → 308 ${location}`);
    } else {
      bad(`live alias /${name} → ${aliasRes.status} ${location || "<no location>"}`);
    }

    const canonRes = await fetch(`${baseUrl}/tools/${name}`, { method: "HEAD", redirect: "manual" });
    if (canonRes.status === 200) {
      ok(`live canonical /tools/${name} → 200`);
    } else {
      bad(`live canonical /tools/${name} → ${canonRes.status}`);
    }
  }
}

console.log("---");
console.log(`Results: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
