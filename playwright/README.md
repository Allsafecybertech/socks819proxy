# NOVAIN SOCKS — External Inventory Sync Worker

Your marketplace exposes a **signed webhook** that ingests fresh proxies from
any external worker (GitHub Codespaces, VPS, self-hosted VM). This folder is
a starter for that worker — it uses Playwright to scrape your upstream
provider (`dichvusocks.net`) and POSTs the results to the webhook.

## Endpoint

```
POST https://socks819proxy.lovable.app/api/public/hooks/inventory-sync
```

Preview (latest dev build):
```
POST https://project--b3333b41-ac70-4fae-b7f4-cf6db2f3aade-dev.lovable.app/api/public/hooks/inventory-sync
```

### Required headers
| Header          | Value |
|-----------------|-------|
| `Content-Type`  | `application/json` |
| `X-Timestamp`   | Current UNIX seconds (rejected if drift > 5 min) |
| `X-Signature`   | `sha256=<hex hmac>` — HMAC-SHA256 of `"${timestamp}.${rawBody}"` using `INVENTORY_SYNC_SECRET` |

### Body
```json
{
  "source": "dichvusocks",
  "proxies": [
    {
      "ip": "1.2.3.4",
      "port": 1080,
      "username": "user",
      "password": "pass",
      "country": "US",
      "city": "New York",
      "isp": "Comcast",
      "proxy_kind": "residential",
      "speed": "fast"
    }
  ]
}
```

Max **5000 proxies per request** — chunk larger batches client-side.

### Response
```json
{ "ok": true, "received": 120, "inserted": 100, "updated": 20, "skipped": 0, "errors": [] }
```

## The shared secret

The webhook is HMAC-signed with `INVENTORY_SYNC_SECRET` (already generated
and stored in Lovable Cloud). Copy the value from
**Backend → Secrets → `INVENTORY_SYNC_SECRET`** and set it as an env var in
your worker (Codespace or VPS):

```bash
export INVENTORY_SYNC_SECRET="paste-value-here"
export NOVAIN_HOOK_URL="https://socks819proxy.lovable.app/api/public/hooks/inventory-sync"
export PROVIDER_URL="https://dichvusocks.net/login"
export PROVIDER_USERNAME="your-upstream-user"
export PROVIDER_PASSWORD="your-upstream-pass"
```

⚠️ **Rotate your `dichvusocks.net` credentials now** — they were exposed
earlier in chat.

## Quick curl test (no scraping)

Send one fake proxy to verify the endpoint accepts your signature:

```bash
BODY='{"source":"manual","proxies":[{"ip":"10.0.0.1","port":1080,"country":"US"}]}'
TS=$(date +%s)
SIG=$(printf "%s.%s" "$TS" "$BODY" | openssl dgst -sha256 -hmac "$INVENTORY_SYNC_SECRET" -hex | awk '{print $2}')
curl -X POST "$NOVAIN_HOOK_URL" \
  -H "Content-Type: application/json" \
  -H "X-Timestamp: $TS" \
  -H "X-Signature: sha256=$SIG" \
  --data "$BODY"
```

Expected: `{"ok":true,"received":1,"inserted":1,...}`. Then delete the fake
proxy from **Admin → Inventory**.

## Running the Playwright sync in a Codespace

```bash
cd playwright
bun install     # or: npm install
bunx playwright install chromium
bun run sync.ts
```

Once verified, promote the same script to a VPS + cron/systemd. The Lovable
app never runs Playwright itself — it just accepts signed batches.

## Files

- `sync.ts` — end-to-end scrape → sign → POST (drop-in starter)
- `runFetch.ts` — legacy Prisma-based reference (kept for parity, not used by `sync.ts`)
- `start-vnc.sh` — VNC bootstrap for headed captcha resolution on a VPS
- `planEngine.ts` / `pricing.ts` / `walletConfig.ts` / `chainVerify.ts` — legacy stubs

## Security notes

- Endpoint bypasses site auth (it's under `/api/public/*`) but **requires**
  a valid HMAC signature — random callers get `401`.
- Timestamp check blocks replay attacks (5-minute window).
- All calls are recorded in `audit_log` with counts.
- The webhook only inserts into `inventory`; it never touches user data,
  payments, or roles.
