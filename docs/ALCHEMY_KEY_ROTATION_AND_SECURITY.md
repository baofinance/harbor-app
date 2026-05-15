# Alchemy Key Rotation and Securing Your RPC

This guide walks you through **rotating your Alchemy API key** and **keeping it secure** so it can’t be extracted from the app and used to burn your quota.

---

## Part 1: Rotate the key in Alchemy

1. **Log in to Alchemy**  
   Go to [dashboard.alchemy.com](https://dashboard.alchemy.com) and sign in.

2. **Open your app**  
   Select the app you use for Harbor (Ethereum mainnet).

3. **Create a new API key**  
   - In the app, open **API Keys** (or **Keys** in the sidebar).  
   - Click **Create new key** (or **+ Create Key**).  
   - Name it something like `harbor-app-prod-2025` and create it.  
   - Copy the new key immediately (you may not see it again).  
   The URL will look like:  
   `https://eth-mainnet.g.alchemy.com/v2/YOUR_NEW_KEY`

4. **Revoke the old key**  
   - In the same **API Keys** list, find the key that was previously used (e.g. the one that might be leaked or abused).  
   - Open it and **Revoke** or **Delete** it.  
   This stops anyone who had the old key from using your account.

5. **(Optional) Check usage**  
   In Alchemy, open **Usage** / **Logs** to see recent traffic. After switching to the new key and the proxy (below), you can confirm that abuse from the old key has stopped.

---

## Part 2: Use the key only on the server (recommended)

If the Alchemy URL is sent to the browser (e.g. via `NEXT_PUBLIC_MAINNET_RPC_URL`), anyone can copy it and hit Alchemy directly, using up your quota. To avoid that, use the **RPC proxy** so the key stays on the server.

### How it works

- The **browser** only talks to **same-origin** `/api/rpc` on whatever host serves the app (production, staging, or a Vercel preview).
- Your **Next.js API route** (`/api/rpc`) receives those requests and forwards them to Alchemy using a **server-only** env var.
- The Alchemy key is never in the frontend bundle, so it can’t be scraped or abused by third parties.

**CORS / abuse:** `/api/rpc` only sets `Access-Control-Allow-Origin` for known production domains, optional `RPC_ALLOWED_ORIGINS` (comma-separated), or when the browser `Origin` matches the request `Host` (same-origin previews and custom deploy URLs). Cross-site browser calls with a foreign `Origin` get **403** and are not forwarded. Requests with no `Origin` (e.g. `curl`) are still accepted. JSON bodies are capped at **512 KiB**.

### Step 1: Set server-only Alchemy URL in Vercel

1. In [Vercel](https://vercel.com), open your Harbor project.
2. Go to **Settings → Environment Variables**.
3. Add (or update):

   | Name                | Value                                              | Environments   |
   |---------------------|----------------------------------------------------|----------------|
   | `MAINNET_RPC_URL`   | `https://eth-mainnet.g.alchemy.com/v2/YOUR_NEW_KEY` | Production, Preview (if previews use `NEXT_PUBLIC_USE_RPC_PROXY=true`) |

   - **Do not** add `NEXT_PUBLIC_` to this variable.  
   - Use the **new** key you created in Part 1.  
   - For **Preview** deployments that use the proxy, set `MAINNET_RPC_URL` on Preview too (otherwise `/api/rpc` returns 503). Development can use a public RPC if you turn the proxy off locally.

#### Optional: add automatic fallback providers

You can provide backup RPC endpoints that are used automatically when the primary returns `429` (rate/capacity) or `5xx` errors.

| Name                           | Value example                                                                 | Environments |
|--------------------------------|-------------------------------------------------------------------------------|--------------|
| `MAINNET_RPC_FALLBACK_URLS`    | `https://mainnet.infura.io/v3/KEY,https://eth-mainnet.public.blastapi.io`    | Production, Preview |

- Comma-separated list, no spaces required.
- Keep these server-only (no `NEXT_PUBLIC_` prefix).
- Primary remains `MAINNET_RPC_URL`; fallbacks are tried in order.

### Step 2: Turn on the RPC proxy

In the same **Environment Variables** section, add:

| Name                         | Value                           | Environments   |
|-----------------------------|----------------------------------|----------------|
| `NEXT_PUBLIC_USE_RPC_PROXY` | `true`                           | Production, Preview (as needed) |

- `NEXT_PUBLIC_USE_RPC_PROXY=true` makes the app use same-origin `/api/rpc` for mainnet instead of a direct RPC URL in the browser.
- With the same flag, **MegaETH** (chainId 4326) uses `/api/rpc?chain=megaeth`; set server-only **`MEGAETH_RPC_URL`** to your MegaETH RPC (e.g. Alchemy `https://megaeth-mainnet.g.alchemy.com/v2/...`). Do not put that URL in `NEXT_PUBLIC_*` if you rely on the proxy. Optional fallbacks: **`MEGAETH_RPC_FALLBACK_URLS`** (comma-separated, server-only).
- You do **not** need `NEXT_PUBLIC_APP_URL` for the RPC proxy; each deployment calls its own `/api/rpc` (avoids CORS when previews are on `*.vercel.app`). Set `NEXT_PUBLIC_APP_URL` only if other features require a canonical site URL.

### Step 3: Remove the old public RPC env var (if set)

If you previously had:

- `NEXT_PUBLIC_MAINNET_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/...`

then **remove** it for Production (or set it to empty). With the proxy enabled, the app no longer needs the Alchemy URL in a public variable. Keeping it would expose the key again.

### Step 4: Redeploy

Trigger a new production deployment so the new env vars and the proxy route are used. After deploy:

- The site should work as before.
- In the browser, network requests for RPC will go to `/api/rpc` on the same host as the page instead of directly to Alchemy.
- Your Alchemy key is only in `MAINNET_RPC_URL` on the server.

---

## Part 3: Local development

For local dev you can either use the proxy or a direct URL.

**Option A – Use proxy (same as production)**  
In `.env.local`:

```bash
MAINNET_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_NEW_KEY
NEXT_PUBLIC_USE_RPC_PROXY=true
```

Run the app; the browser will call `http://localhost:3000/api/rpc`, and the server will forward to Alchemy. (Optional: `NEXT_PUBLIC_APP_URL=http://localhost:3000` if other code needs a canonical base URL.)

**Option B – Direct URL (no proxy)**  
In `.env.local`:

```bash
NEXT_PUBLIC_MAINNET_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_NEW_KEY
# Do NOT set NEXT_PUBLIC_USE_RPC_PROXY
```

The key is in the frontend here; use only for dev and never commit `.env.local`.

---

### MegaETH (same proxy flag)

When `NEXT_PUBLIC_USE_MEGAETH=true` and you use **`NEXT_PUBLIC_USE_RPC_PROXY=true`**, the app sends MegaETH JSON-RPC to **`/api/rpc?chain=megaeth`**. Configure the upstream on the server only:

| Name                         | Value example                                                                 | Environments   |
|------------------------------|-------------------------------------------------------------------------------|----------------|
| `MEGAETH_RPC_URL`            | `https://megaeth-mainnet.g.alchemy.com/v2/YOUR_KEY`                          | Production, Preview, local (with proxy) |
| `MEGAETH_RPC_FALLBACK_URLS` | Comma-separated backup URLs (optional)                                       | As needed      |

Remove or leave unset **`NEXT_PUBLIC_MEGAETH_RPC_URL`** in Production when using the proxy, so the Alchemy MegaETH key is not bundled for the client.

---

## Checklist

- [ ] New Alchemy key created; old key revoked in Alchemy dashboard.
- [ ] In Vercel: `MAINNET_RPC_URL` set (server-only, no `NEXT_PUBLIC_`) with the new key.
- [ ] In Vercel: `NEXT_PUBLIC_USE_RPC_PROXY=true` and `NEXT_PUBLIC_APP_URL=https://app.harborfinance.io` for Production.
- [ ] In Vercel: `NEXT_PUBLIC_MAINNET_RPC_URL` removed or cleared for Production (if it previously contained the Alchemy URL).
- [ ] If using MegaETH with the proxy: **`MEGAETH_RPC_URL`** set (server-only); **`NEXT_PUBLIC_MEGAETH_RPC_URL`** removed or cleared for Production so the MegaETH Alchemy URL is not in the client bundle.
- [ ] Production redeployed and tested (connect wallet, load data).
- [ ] Optional: Alchemy usage/logs checked to confirm no more abuse from the old key.

---

## If you don’t use the proxy

If you choose not to use the proxy and keep using `NEXT_PUBLIC_MAINNET_RPC_URL` with an Alchemy URL:

- **Still rotate the key** (Part 1) so the old one is revoked.
- Set the **new** key only in Vercel as `NEXT_PUBLIC_MAINNET_RPC_URL` for Production.
- **Never** commit the key or put it in `.env.example`. Anyone who can open your app can still copy the URL from the browser, so abuse is still possible; rotating at least limits damage and lets you monitor the new key in Alchemy.

For best security and to avoid quota abuse, use the proxy and keep the key in `MAINNET_RPC_URL` only.
