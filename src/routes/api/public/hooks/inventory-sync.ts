import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { z } from "zod";

/**
 * Inventory Sync Webhook — external worker (e.g. GitHub Codespaces Playwright job)
 * POSTs signed proxy batches here to upsert into public.inventory.
 *
 * Headers:
 *   Content-Type: application/json
 *   X-Signature: sha256=<hex hmac of raw body using INVENTORY_SYNC_SECRET>
 *   X-Timestamp: <unix seconds> (rejected if drift > 300s to block replay)
 *
 * Body:
 *   {
 *     "source": "dichvusocks",
 *     "proxies": [
 *       { "ip":"1.2.3.4","port":1080,"username":"u","password":"p",
 *         "country":"US","city":"NYC","isp":"Comcast","proxy_kind":"residential","speed":"fast" },
 *       ...
 *     ]
 *   }
 *
 * Response: { received, inserted, updated, skipped, errors }
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
});

const BodySchema = z.object({
  source: z.string().max(64).default("external"),
  proxies: z.array(ProxySchema).min(1).max(5000),
});

const MAX_CLOCK_DRIFT_SEC = 300;

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
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
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

        // Anti-replay
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
        try {
          parsedJson = JSON.parse(rawBody);
        } catch {
          return jsonResponse(400, { error: "Invalid JSON" });
        }

        const parsed = BodySchema.safeParse(parsedJson);
        if (!parsed.success) {
          return jsonResponse(400, { error: "Validation failed", issues: parsed.error.flatten() });
        }

        const { source, proxies } = parsed.data;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        let inserted = 0;
        let updated = 0;
        let skipped = 0;
        const errors: { ip: string; port: number; message: string }[] = [];

        // Batch upsert in chunks of 500 (Postgres/PostgREST safety)
        const chunkSize = 500;
        for (let i = 0; i < proxies.length; i += chunkSize) {
          const chunk = proxies.slice(i, i + chunkSize);
          for (const p of chunk) {
            const { data: existing, error: selErr } = await supabaseAdmin
              .from("inventory")
              .select("id,status")
              .eq("ip", p.ip)
              .eq("port", p.port)
              .maybeSingle();

            if (selErr) {
              errors.push({ ip: p.ip, port: p.port, message: selErr.message });
              continue;
            }

            if (existing) {
              // Refresh credentials/metadata but don't touch assignment state
              const { error: updErr } = await supabaseAdmin
                .from("inventory")
                .update({
                  username: p.username ?? null,
                  password: p.password ?? null,
                  country: p.country,
                  city: p.city ?? null,
                  region: p.region ?? null,
                  isp: p.isp ?? null,
                  zipcode: p.zipcode ?? null,
                  host: p.host ?? null,
                  proxy_kind: p.proxy_kind ?? null,
                  auth_type: p.auth_type ?? null,
                  speed: p.speed ?? null,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", existing.id);
              if (updErr) errors.push({ ip: p.ip, port: p.port, message: updErr.message });
              else updated++;
            } else {
              const { error: insErr } = await supabaseAdmin.from("inventory").insert({
                ip: p.ip,
                port: p.port,
                username: p.username ?? null,
                password: p.password ?? null,
                country: p.country,
                city: p.city ?? null,
                region: p.region ?? null,
                isp: p.isp ?? null,
                zipcode: p.zipcode ?? null,
                host: p.host ?? null,
                proxy_kind: p.proxy_kind ?? null,
                auth_type: p.auth_type ?? null,
                speed: p.speed ?? null,
                status: "available",
              });
              if (insErr) {
                if (insErr.code === "23505") skipped++;
                else errors.push({ ip: p.ip, port: p.port, message: insErr.message });
              } else inserted++;
            }
          }
        }

        // Audit
        await supabaseAdmin.from("audit_log").insert({
          action: "inventory.sync",
          entity: "inventory",
          metadata: {
            source,
            received: proxies.length,
            inserted,
            updated,
            skipped,
            error_count: errors.length,
          },
        });

        return jsonResponse(200, {
          ok: true,
          source,
          received: proxies.length,
          inserted,
          updated,
          skipped,
          errors: errors.slice(0, 20),
        });
      },
    },
  },
});
