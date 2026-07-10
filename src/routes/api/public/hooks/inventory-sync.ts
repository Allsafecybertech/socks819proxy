import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual, randomBytes } from "crypto";
import { z } from "zod";

/**
 * Inventory Sync Webhook — external worker (Replit / GitHub Codespaces / VPS)
 * POSTs signed proxy batches here to upsert into public.inventory.
 *
 * Security: HMAC-SHA256 over `<x-timestamp>.<rawBody>` using INVENTORY_SYNC_SECRET.
 * Timestamp drift > 300s rejected (anti-replay).
 *
 * Credential rewriting: on every ingest we OVERWRITE the incoming username/password
 * for unassigned proxies with unique per-proxy credentials:
 *   username = `socks819proxy_<8-hex>`
 *   password = 20-char urlsafe random
 * Assigned proxies (assigned_user_id IS NOT NULL) keep their existing credentials —
 * we never rotate a proxy that a paying customer is currently using.
 */

const ProxySchema = z.object({
  ip: z.string().min(3).max(64),
  port: z.number().int().min(1).max(65535),
  username: z.string().max(128).optional().nullable(),
  password: z.string().max(256).optional().nullable(),
  country: z.string().min(2).max(64).default("XX"),
  city: z.string().max(128).optional().nullable(),
  region: z.string().max(128).optional().nullable(),
  isp: z.string().max(128).optional().nullable(),
  zipcode: z.string().max(32).optional().nullable(),
  host: z.string().max(255).optional().nullable(),
  proxy_kind: z.string().max(32).optional().nullable(),
  auth_type: z.string().max(32).optional().nullable(),
  speed: z.string().max(32).optional().nullable(),
  is_online: z.boolean().optional(),
  blacklisted: z.boolean().optional(),
});

const BodySchema = z.object({
  source: z.string().max(64).default("external"),
  proxies: z.array(ProxySchema).min(1).max(5000),
});

const MAX_CLOCK_DRIFT_SEC = 300;
const USERNAME_PREFIX = "socks819proxy";

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function verifySignature(secret: string, rawBody: string, header: string | null): boolean {
  if (!header) return false;
  const provided = header.startsWith("sha256=") ? header.slice(7) : header;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(provided, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length || a.length === 0) return false;
  try { return timingSafeEqual(a, b); } catch { return false; }
}

function newUsername(): string {
  return `${USERNAME_PREFIX}_${randomBytes(4).toString("hex")}`;
}
function newPassword(): string {
  // urlsafe base64, ~20 chars
  return randomBytes(15).toString("base64").replace(/[+/=]/g, "").slice(0, 20);
}

export const Route = createFileRoute("/api/public/hooks/inventory-sync")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "access-control-allow-origin": "*",
            "access-control-allow-methods": "POST, OPTIONS",
            "access-control-allow-headers": "content-type, x-signature, x-timestamp",
          },
        }),

      POST: async ({ request }) => {
        const secret = process.env.INVENTORY_SYNC_SECRET;
        if (!secret) return jsonResponse(500, { error: "Server not configured" });

        const ts = Number(request.headers.get("x-timestamp") ?? "0");
        const now = Math.floor(Date.now() / 1000);
        if (!ts || Math.abs(now - ts) > MAX_CLOCK_DRIFT_SEC) {
          return jsonResponse(401, { error: "Stale or missing timestamp" });
        }

        const rawBody = await request.text();
        if (!verifySignature(secret, `${ts}.${rawBody}`, request.headers.get("x-signature"))) {
          return jsonResponse(401, { error: "Invalid signature" });
        }

        let parsedJson: unknown;
        try { parsedJson = JSON.parse(rawBody); }
        catch { return jsonResponse(400, { error: "Invalid JSON" }); }

        const parsed = BodySchema.safeParse(parsedJson);
        if (!parsed.success) {
          return jsonResponse(400, { error: "Validation failed", issues: parsed.error.flatten() });
        }

        const { source, proxies } = parsed.data;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        let inserted = 0, updated = 0, skipped = 0, credsRotated = 0;
        const errors: { ip: string; port: number; message: string }[] = [];

        const chunkSize = 500;
        for (let i = 0; i < proxies.length; i += chunkSize) {
          const chunk = proxies.slice(i, i + chunkSize);
          for (const p of chunk) {
            const { data: existing, error: selErr } = await supabaseAdmin
              .from("inventory")
              .select("id,assigned_user_id,username,password")
              .eq("ip", p.ip)
              .eq("port", p.port)
              .maybeSingle();

            if (selErr) {
              errors.push({ ip: p.ip, port: p.port, message: selErr.message });
              continue;
            }

            if (existing) {
              // NEVER rotate credentials of assigned proxies
              const keepCreds = !!existing.assigned_user_id;
              const patch: Record<string, unknown> = {
                country: p.country,
                city: p.city ?? null,
                region: p.region ?? null,
                isp: p.isp ?? null,
                zipcode: p.zipcode ?? null,
                host: p.host ?? null,
                proxy_kind: p.proxy_kind ?? null,
                auth_type: p.auth_type ?? "user_pass",
                speed: p.speed ?? null,
                is_online: p.is_online ?? true,
                blacklisted: p.blacklisted ?? false,
                last_checked_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              };
              if (!keepCreds) {
                patch.username = existing.username ?? newUsername();
                patch.password = existing.password ?? newPassword();
                if (!existing.username || !existing.password) credsRotated++;
              }
              const { error: updErr } = await supabaseAdmin.from("inventory").update(patch).eq("id", existing.id);
              if (updErr) errors.push({ ip: p.ip, port: p.port, message: updErr.message });
              else updated++;
            } else {
              const { error: insErr } = await supabaseAdmin.from("inventory").insert({
                ip: p.ip,
                port: p.port,
                username: newUsername(),
                password: newPassword(),
                country: p.country,
                city: p.city ?? null,
                region: p.region ?? null,
                isp: p.isp ?? null,
                zipcode: p.zipcode ?? null,
                host: p.host ?? null,
                proxy_kind: p.proxy_kind ?? null,
                auth_type: p.auth_type ?? "user_pass",
                speed: p.speed ?? null,
                is_online: p.is_online ?? true,
                blacklisted: p.blacklisted ?? false,
                status: "available",
                last_checked_at: new Date().toISOString(),
              });
              if (insErr) {
                if (insErr.code === "23505") skipped++;
                else errors.push({ ip: p.ip, port: p.port, message: insErr.message });
              } else { inserted++; credsRotated++; }
            }
          }
        }

        await supabaseAdmin.from("audit_log").insert({
          action: "inventory.sync",
          entity: "inventory",
          metadata: {
            source, received: proxies.length,
            inserted, updated, skipped,
            creds_rotated: credsRotated,
            error_count: errors.length,
          },
        });

        return jsonResponse(200, {
          ok: true, source,
          received: proxies.length,
          inserted, updated, skipped,
          creds_rotated: credsRotated,
          errors: errors.slice(0, 20),
        });
      },
    },
  },
});
