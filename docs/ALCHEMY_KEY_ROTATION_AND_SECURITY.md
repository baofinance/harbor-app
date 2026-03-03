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

- The **browser** only talks to your app: `https://app.harborfinance.io/api/rpc`.
- Your **Next.js API route** (`/api/rpc`) receives those requests and forwards them to Alchemy using a **server-only** env var.
- The Alchemy key is never in the frontend bundle, so it can’t be scraped or abused by third parties.

### Step 1: Set server-only Alchemy URL in Vercel

1. In [Vercel](https://vercel.com), open your Harbor project.
2. Go to **Settings → Environment Variables**.
3. Add (or update):

   | Name                | Value                                              | Environments   |
   |---------------------|----------------------------------------------------|----------------|
   | `MAINNET_RPC_URL`   | `https://eth-mainnet.g.alchemy.com/v2/YOUR_NEW_KEY` | Production     |

   - **Do not** add `NEXT_PUBLIC_` to this variable.  
   - Use the **new** key you created in Part 1.  
   - Leave it empty for Preview/Development if you want those to use a public RPC.

### Step 2: Turn on the RPC proxy and set app URL

In the same **Environment Variables** section, add:

| Name                         | Value                           | Environments   |
|-----------------------------|----------------------------------|----------------|
| `NEXT_PUBLIC_USE_RPC_PROXY` | `true`                           | Production     |
| `NEXT_PUBLIC_APP_URL`       | `https://app.harborfinance.io`   | Production     |

- `NEXT_PUBLIC_USE_RPC_PROXY=true` makes the app use `/api/rpc` for mainnet instead of a direct RPC URL.
- `NEXT_PUBLIC_APP_URL` is the canonical origin of the app (no trailing slash). The client will request `NEXT_PUBLIC_APP_URL + '/api/rpc'`.

### Step 3: Remove the old public RPC env var (if set)

If you previously had:

- `NEXT_PUBLIC_MAINNET_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/...`

then **remove** it for Production (or set it to empty). With the proxy enabled, the app no longer needs the Alchemy URL in a public variable. Keeping it would expose the key again.

### Step 4: Redeploy

Trigger a new production deployment so the new env vars and the proxy route are used. After deploy:

- The site should work as before.
- In the browser, network requests for RPC will go to `https://app.harborfinance.io/api/rpc` instead of Alchemy.
- Your Alchemy key is only in `MAINNET_RPC_URL` on the server.

---

## Part 3: Local development

For local dev you can either use the proxy or a direct URL.

**Option A – Use proxy (same as production)**  
In `.env.local`:

```bash
MAINNET_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_NEW_KEY
NEXT_PUBLIC_USE_RPC_PROXY=true
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Run the app; it will call `http://localhost:3000/api/rpc`, and the server will forward to Alchemy.

**Option B – Direct URL (no proxy)**  
In `.env.local`:

```bash
NEXT_PUBLIC_MAINNET_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_NEW_KEY
# Do NOT set NEXT_PUBLIC_USE_RPC_PROXY
```

The key is in the frontend here; use only for dev and never commit `.env.local`.

---

## Checklist

- [ ] New Alchemy key created; old key revoked in Alchemy dashboard.
- [ ] In Vercel: `MAINNET_RPC_URL` set (server-only, no `NEXT_PUBLIC_`) with the new key.
- [ ] In Vercel: `NEXT_PUBLIC_USE_RPC_PROXY=true` and `NEXT_PUBLIC_APP_URL=https://app.harborfinance.io` for Production.
- [ ] In Vercel: `NEXT_PUBLIC_MAINNET_RPC_URL` removed or cleared for Production (if it previously contained the Alchemy URL).
- [ ] Production redeployed and tested (connect wallet, load data).
- [ ] Optional: Alchemy usage/logs checked to confirm no more abuse from the old key.

---

## If you don’t use the proxy

If you choose not to use the proxy and keep using `NEXT_PUBLIC_MAINNET_RPC_URL` with an Alchemy URL:

- **Still rotate the key** (Part 1) so the old one is revoked.
- Set the **new** key only in Vercel as `NEXT_PUBLIC_MAINNET_RPC_URL` for Production.
- **Never** commit the key or put it in `.env.example`. Anyone who can open your app can still copy the URL from the browser, so abuse is still possible; rotating at least limits damage and lets you monitor the new key in Alchemy.

For best security and to avoid quota abuse, use the proxy and keep the key in `MAINNET_RPC_URL` only.
