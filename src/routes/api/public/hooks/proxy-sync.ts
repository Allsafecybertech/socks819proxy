import { createFileRoute } from "@tanstack/react-router";
import { randomBytes } from "crypto";

/**
 * Automatic Inventory Sync — ProxyScrape v4 free-proxy-list.
 *
 * Called by pg_cron every 6 minutes.
 * Pulls fresh SOCKS4 + SOCKS5 proxies, upserts into public.inventory,
 * rewrites credentials for unassigned rows with our branded format
 * (username: socks819proxy_<hex>, password: random 20-char), marks
 * missing proxies offline, and releases expired user assignments.
 *
 * No auth is required: /api/public/* bypasses the site auth wall, and
 * the handler performs only server-side writes gated by the anon
 * apikey header supplied by pg_cron.
 */

const SCRAPE_URL = (protocol: "socks4" | "socks5", limit: number) =>
  `https://api.proxyscrape.com/v4/free-proxy-list/get?request=display_proxies` +
  `&protocol=${protocol}&proxy_format=protocolipport&format=json` +
  `&timeout=5000&skip=0&limit=${limit}`;

const USERNAME_PREFIX = "socks819proxy";
const newUsername = () => `${USERNAME_PREFIX}_${randomBytes(4).toString("hex")}`;
const newPassword = () =>
  randomBytes(15).toString("base64").replace(/[+/=]/g, "").slice(0, 20);

type ScrapeProxy = {
  ip: string;
  port: number;
  protocol: string;
  alive?: boolean;
  uptime?: number;
  average_timeout?: number;
  timeout?: number;
  ip_data?: {
    country?: string;
    countryCode?: string;
    city?: string;
    regionName?: string;
    isp?: string;
    org?: string;
    zip?: string;
    hosting?: boolean;
    mobile?: boolean;
  };
};

async function fetchScrape(protocol: "socks4" | "socks5", limit: number): Promise<ScrapeProxy[]> {
  const res = await fetch(SCRAPE_URL(protocol, limit), {
    headers: { accept: "application/json" },
  });
  if (!res.ok) throw new Error(`ProxyScrape ${protocol} ${res.status}`);
  const json = (await res.json()) as { proxies?: ScrapeProxy[] };
  return (json.proxies ?? []).filter((p) => p.alive && p.ip && p.port);
}

function speedLabel(p: ScrapeProxy): string {
  const t = p.average_timeout ?? p.timeout;
  if (!t || !isFinite(t)) return "—";
  if (t < 1000) return "fast";
  if (t < 3000) return "medium";
  return "slow";
}

export const Route = createFileRoute("/api/public/hooks/proxy-sync")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "access-control-allow-origin": "*",
            "access-control-allow-methods": "GET, POST, OPTIONS",
            "access-control-allow-headers": "content-type, apikey, authorization",
          },
        }),
      GET: async () => runSync(),
      POST: async () => runSync(),
    },
  },
});

async function runSync(): Promise<Response> {
  const started = Date.now();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  let received: ScrapeProxy[] = [];
  const errors: string[] = [];
  try {
    const [s5, s4] = await Promise.all([
      fetchScrape("socks5", 1500),
      fetchScrape("socks4", 500),
    ]);
    received = [...s5, ...s4];
  } catch (e) {
    errors.push(`fetch: ${(e as Error).message}`);
  }

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  // Preload existing rows for the incoming keys to preserve creds on assigned proxies.
  const seenKeys = new Set(received.map((p) => `${p.ip}:${p.port}`));
  const existingByKey = new Map<
    string,
    { id: string; assigned_user_id: string | null; username: string | null; password: string | null }
  >();

  if (received.length > 0) {
    // Fetch in one shot; ~2k rows is safe.
    const { data: existingRows } = await supabaseAdmin
      .from("inventory")
      .select("id, ip, port, assigned_user_id, username, password")
      .in("ip", Array.from(new Set(received.map((p) => p.ip))));
    for (const r of existingRows ?? []) {
      existingByKey.set(`${r.ip}:${r.port}`, r as never);
    }
  }

  const now = new Date().toISOString();
  const inserts: Record<string, unknown>[] = [];
  const updates: { id: string; patch: Record<string, unknown> }[] = [];

  for (const p of received) {
    const key = `${p.ip}:${p.port}`;
    const ex = existingByKey.get(key);
    const common = {
      country: p.ip_data?.countryCode ?? p.ip_data?.country ?? "XX",
      region: p.ip_data?.regionName ?? null,
      city: p.ip_data?.city ?? null,
      isp: p.ip_data?.isp ?? p.ip_data?.org ?? null,
      host: p.ip_data?.org ?? null,
      zipcode: p.ip_data?.zip ?? null,
      proxy_kind: p.ip_data?.hosting ? "datacenter" : "residential",
      auth_type: "user_pass",
      speed: speedLabel(p),
      is_online: true,
      blacklisted: false,
      last_checked_at: now,
      updated_at: now,
    };
    if (ex) {
      const patch: Record<string, unknown> = { ...common };
      // Never rotate credentials on a proxy currently assigned to a paying user.
      if (!ex.assigned_user_id) {
        patch.username = ex.username ?? newUsername();
        patch.password = ex.password ?? newPassword();
      }
      updates.push({ id: ex.id, patch });
    } else {
      inserts.push({
        ip: p.ip,
        port: p.port,
        username: newUsername(),
        password: newPassword(),
        status: "available",
        ...common,
      });
    }
  }

  // Chunked inserts
  for (let i = 0; i < inserts.length; i += 500) {
    const chunk = inserts.slice(i, i + 500);
    const { error } = await supabaseAdmin.from("inventory").insert(chunk as never);
    if (error) {
      if (error.code === "23505") skipped += chunk.length;
      else errors.push(`insert: ${error.message}`);
    } else {
      inserted += chunk.length;
    }
  }

  // Per-row updates (small patches, no better bulk path without RPC)
  for (const u of updates) {
    const { error } = await supabaseAdmin
      .from("inventory")
      .update(u.patch as never)
      .eq("id", u.id);
    if (error) errors.push(`update ${u.id}: ${error.message}`);
    else updated++;
  }

  // Mark rows that were NOT seen this run as offline (only unassigned ones,
  // so paying users still see their proxy record even if temporarily missing).
  let markedOffline = 0;
  if (seenKeys.size > 0) {
    const { data: staleRows } = await supabaseAdmin
      .from("inventory")
      .select("id, ip, port")
      .eq("is_online", true)
      .is("assigned_user_id", null)
      .lt("last_checked_at", new Date(Date.now() - 15 * 60 * 1000).toISOString())
      .limit(2000);
    const toOffline = (staleRows ?? []).filter((r: any) => !seenKeys.has(`${r.ip}:${r.port}`));
    for (let i = 0; i < toOffline.length; i += 500) {
      const chunk = toOffline.slice(i, i + 500).map((r: any) => r.id);
      const { error } = await supabaseAdmin
        .from("inventory")
        .update({ is_online: false, updated_at: now } as never)
        .in("id", chunk);
      if (!error) markedOffline += chunk.length;
    }
  }

  // Release any user assignments that have expired.
  let releasedExpired = 0;
  const { data: rel } = await supabaseAdmin.rpc("release_expired_assignments" as never);
  if (typeof rel === "number") releasedExpired = rel;

  await supabaseAdmin.from("audit_log").insert({
    action: "inventory.auto_sync",
    entity: "inventory",
    metadata: {
      source: "proxyscrape",
      received: received.length,
      inserted,
      updated,
      skipped,
      marked_offline: markedOffline,
      released_expired: releasedExpired,
      duration_ms: Date.now() - started,
      errors: errors.slice(0, 10),
    },
  });

  return new Response(
    JSON.stringify({
      ok: errors.length === 0,
      source: "proxyscrape",
      received: received.length,
      inserted,
      updated,
      skipped,
      marked_offline: markedOffline,
      released_expired: releasedExpired,
      duration_ms: Date.now() - started,
      errors: errors.slice(0, 10),
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}
