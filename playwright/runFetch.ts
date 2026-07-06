// lib/fetcher/runFetch.ts
//
// Runs one Playwright session against your provider's dashboard,
// scrapes the proxy list, and stores results as AVAILABLE in the
// Proxy table. If a captcha is detected, the session PAUSES and
// exposes a VNC url so an admin can solve it by hand from the
// dashboard, then the script resumes automatically.
//
// This assumes the browser runs headed inside Xvfb + x11vnc + noVNC
// on the same machine as the Next.js app (see scripts/start-vnc.sh).

import { chromium, Browser, Page } from "playwright";
import { PrismaClient, FetchStatus, ProxyStatus } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

const STORAGE_STATE_PATH = path.resolve(process.cwd(), ".auth/provider-state.json");
const PROVIDER_URL = process.env.PROVIDER_URL!; // e.g. https://dashboard.yourprovider.com/login
const PROVIDER_USER = process.env.PROVIDER_USERNAME!;
const PROVIDER_PASS = process.env.PROVIDER_PASSWORD!;
const NOVNC_URL = process.env.NOVNC_URL!; // e.g. http://your-server:6080/vnc.html

// Polling interval while paused for manual captcha resolution
const RESUME_POLL_MS = 5000;
// Give up waiting for manual resolution after this long
const MAX_PAUSE_MS = 15 * 60 * 1000;

export async function runFetch(providerName: string) {
  const session = await prisma.fetchSession.create({
    data: { providerName, status: FetchStatus.RUNNING, vncUrl: NOVNC_URL },
  });

  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({
      headless: false, // headed so it renders into the Xvfb display the VNC server shares
      args: ["--disable-blink-features=AutomationControlled"],
    });

    const hasSavedState = fs.existsSync(STORAGE_STATE_PATH);
    const context = await browser.newContext(
      hasSavedState ? { storageState: STORAGE_STATE_PATH } : {}
    );
    const page = await context.newPage();

    await page.goto(PROVIDER_URL, { waitUntil: "domcontentloaded" });

    // If we're not already logged in (no saved session, or it expired), log in.
    const needsLogin = await page.locator("input[name='username'], input[type='email']").first().isVisible().catch(() => false);
    if (needsLogin) {
      await page.fill("input[name='username'], input[type='email']", PROVIDER_USER);
      await page.fill("input[name='password'], input[type='password']", PROVIDER_PASS);
      await page.click("button[type='submit']");
      await page.waitForLoadState("networkidle");
    }

    // --- Captcha detection & manual handoff ---
    const captchaVisible = await detectCaptcha(page);
    if (captchaVisible) {
      await prisma.fetchSession.update({
        where: { id: session.id },
        data: { status: FetchStatus.PAUSED_FOR_CAPTCHA },
      });

      await waitForManualResolution(page, session.id);
    }

    // Persist the now-authenticated session so future runs skip login entirely
    fs.mkdirSync(path.dirname(STORAGE_STATE_PATH), { recursive: true });
    await context.storageState({ path: STORAGE_STATE_PATH });

    // --- Navigate to the proxy list and scrape ---
    await page.goto(`${PROVIDER_URL.replace(/\/login.*/, "")}/proxies`, {
      waitUntil: "networkidle",
    });

    const scraped = await scrapeProxyTable(page);

    // Upsert into DB as AVAILABLE, skipping anything already known (by ip:port)
    let inserted = 0;
    for (const p of scraped) {
      const exists = await prisma.proxy.findFirst({
        where: { ip: p.ip, port: p.port, status: { not: ProxyStatus.EXPIRED } },
      });
      if (exists) continue;

      await prisma.proxy.create({
        data: {
          ip: p.ip,
          port: p.port,
          username: p.username,
          password: p.password,
          location: p.location,
          providerName,
          status: ProxyStatus.AVAILABLE,
        },
      });
      inserted++;
    }

    await prisma.fetchSession.update({
      where: { id: session.id },
      data: {
        status: FetchStatus.COMPLETED,
        proxiesFound: inserted,
        completedAt: new Date(),
      },
    });

    return { inserted, total: scraped.length };
  } catch (err: any) {
    await prisma.fetchSession.update({
      where: { id: session.id },
      data: {
        status: FetchStatus.FAILED,
        log: String(err?.message ?? err),
        completedAt: new Date(),
      },
    });
    throw err;
  } finally {
    await browser?.close();
  }
}

// ---------------------------------------------------------------------------
// Heuristic captcha detection — adjust selectors to match your provider
// ---------------------------------------------------------------------------
async function detectCaptcha(page: Page): Promise<boolean> {
  const selectors = [
    "iframe[src*='recaptcha']",
    "iframe[src*='hcaptcha']",
    "div.g-recaptcha",
    "#challenge-form", // Cloudflare challenge page
  ];
  for (const sel of selectors) {
    if (await page.locator(sel).first().isVisible().catch(() => false)) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// While paused, poll the DB for the admin flipping status back to RUNNING
// (the admin dashboard's "Resume" button does this after solving the captcha
// live over the VNC viewer) OR poll the page itself for the captcha clearing.
// ---------------------------------------------------------------------------
async function waitForManualResolution(page: Page, sessionId: string) {
  const start = Date.now();

  while (Date.now() - start < MAX_PAUSE_MS) {
    const stillBlocked = await detectCaptcha(page);
    if (!stillBlocked) {
      await prisma.fetchSession.update({
        where: { id: sessionId },
        data: { status: FetchStatus.RUNNING },
      });
      return;
    }
    await new Promise((r) => setTimeout(r, RESUME_POLL_MS));
  }

  throw new Error("Timed out waiting for manual captcha resolution");
}

// ---------------------------------------------------------------------------
// Scrape the provider's proxy table into a plain array.
// Placeholder selectors — replace with your provider's actual DOM structure.
// ---------------------------------------------------------------------------
async function scrapeProxyTable(page: Page) {
  await page.waitForSelector("table tbody tr", { timeout: 15000 });

  return page.$$eval("table tbody tr", (rows) =>
    rows.map((row) => {
      const cells = Array.from(row.querySelectorAll("td")).map((td) => td.textContent?.trim() ?? "");
      const [ipPort, username, password, location] = cells;
      const [ip, portStr] = (ipPort ?? "").split(":");
      return {
        ip,
        port: Number(portStr),
        username,
        password,
        location,
      };
    })
  );
}
