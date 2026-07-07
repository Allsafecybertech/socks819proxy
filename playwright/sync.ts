/**
 * NOVAIN SOCKS — external inventory sync worker.
 *
 * Scrapes the upstream provider with Playwright, then POSTs a signed batch
 * to /api/public/hooks/inventory-sync on your marketplace.
 *
 * Env vars (set in your Codespace / VPS):
 *   NOVAIN_HOOK_URL          e.g. https://socks819proxy.lovable.app/api/public/hooks/inventory-sync
 *   INVENTORY_SYNC_SECRET    copy from Lovable Cloud → Secrets
 *   PROVIDER_URL             https://dichvusocks.net/login
 *   PROVIDER_USERNAME        upstream login
 *   PROVIDER_PASSWORD        upstream password
 *
 * Run:  bunx playwright install chromium && bun run sync.ts
 */

import { chromium } from "playwright";
import { createHmac } from "crypto";

type Proxy = {
  ip: string;
  port: number;
  username?: string;
  password?: string;
  country: string;
  city?: string;
  isp?: string;
  proxy_kind?: string;
  speed?: string;
};

const {
  NOVAIN_HOOK_URL,
  INVENTORY_SYNC_SECRET,
  PROVIDER_URL,
  PROVIDER_USERNAME,
  PROVIDER_PASSWORD,
} = process.env;

if (!NOVAIN_HOOK_URL || !INVENTORY_SYNC_SECRET || !PROVIDER_URL || !PROVIDER_USERNAME || !PROVIDER_PASSWORD) {
  console.error("Missing env vars. See playwright/README.md");
  process.exit(1);
}

async function scrapeProxies(): Promise<Proxy[]> {
  const browser = await chromium.launch({ headless: true });
  try {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    await page.goto(PROVIDER_URL!, { waitUntil: "domcontentloaded" });

    // Login (adjust selectors to match the provider's actual form)
    const needsLogin = await page.locator("input[type='password']").first().isVisible().catch(() => false);
    if (needsLogin) {
      await page.fill("input[name='username'], input[type='email']", PROVIDER_USERNAME!);
      await page.fill("input[type='password']", PROVIDER_PASSWORD!);
      await page.click("button[type='submit']");
      await page.waitForLoadState("networkidle");
    }

    // Navigate to the proxy list page and scrape the table
    const base = PROVIDER_URL!.replace(/\/login.*$/, "");
    await page.goto(`${base}/proxies`, { waitUntil: "networkidle" });
    await page.waitForSelector("table tbody tr", { timeout: 15000 });

    return page.$$eval("table tbody tr", (rows) =>
      rows
        .map((row) => {
          const cells = Array.from(row.querySelectorAll("td")).map((td) => td.textContent?.trim() ?? "");
          const [ipPort, username, password, location] = cells;
          const [ip, portStr] = (ipPort ?? "").split(":");
          const port = Number(portStr);
          if (!ip || !port) return null;
          return {
            ip,
            port,
            username: username || undefined,
            password: password || undefined,
            country: (location || "XX").slice(0, 2).toUpperCase(),
            city: location || undefined,
            proxy_kind: "residential",
          } as Proxy;
        })
        .filter((p): p is Proxy => !!p),
    );
  } finally {
    await browser.close();
  }
}

async function pushBatch(proxies: Proxy[]) {
  const body = JSON.stringify({ source: "dichvusocks", proxies });
  const ts = Math.floor(Date.now() / 1000);
  const sig = createHmac("sha256", INVENTORY_SYNC_SECRET!).update(`${ts}.${body}`).digest("hex");

  const res = await fetch(NOVAIN_HOOK_URL!, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-timestamp": String(ts),
      "x-signature": `sha256=${sig}`,
    },
    body,
  });

  const json = await res.json().catch(() => ({}));
  console.log(`[${res.status}]`, json);
  if (!res.ok) process.exit(1);
}

async function main() {
  console.log("Scraping upstream...");
  const proxies = await scrapeProxies();
  console.log(`Scraped ${proxies.length} proxies`);
  if (proxies.length === 0) return;

  const CHUNK = 2000;
  for (let i = 0; i < proxies.length; i += CHUNK) {
    const chunk = proxies.slice(i, i + CHUNK);
    console.log(`Pushing ${chunk.length} (${i + chunk.length}/${proxies.length})...`);
    await pushBatch(chunk);
  }
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
