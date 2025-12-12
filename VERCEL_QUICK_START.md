# Vercel Staging Setup - Quick Start

## TL;DR - Get Staging Live in 10 Minutes

### 1. Create Vercel Project

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import `baofinance/harbor-app` from GitHub
3. Project name: `harbor-app-staging`
4. Framework: Next.js (auto-detected)
5. Click **Deploy**

### 2. Add Environment Variable

In Vercel project → **Settings** → **Environment Variables**:

```
NEXT_PUBLIC_APP_ENV = staging
```

### 3. Add Custom Domains

In Vercel project → **Settings** → **Domains**:

- Add: `staging.app.harborfinance.io`
- Vercel will show DNS instructions

### 4. Configure DNS in GoDaddy

1. Go to GoDaddy → **My Products** → **Domains** → `harborfinance.io` → **DNS**
2. Add CNAME record:
   ```
   Type: CNAME
   Name: staging.app
   Value: [value from Vercel - usually cname.vercel-dns.com]
   TTL: 600
   ```

### 5. Wait & Deploy

- Wait 5-15 minutes for DNS propagation
- Push to `staging` branch or deploy manually
- Visit `https://staging.app.harborfinance.io`

## DNS Record Examples

### For staging.app.harborfinance.io:

```
Type: CNAME
Name: staging.app
Value: cname.vercel-dns.com
TTL: 600
```

**Note**: If GoDaddy doesn't support `staging.app` as a subdomain, you may need to:

- Use `staging-app` instead, then configure in Vercel
- Or contact GoDaddy support for multi-level subdomain support

## Branch Strategy

**Option 1: Separate Branch (Recommended)**

```bash
git checkout -b staging
git push origin staging
```

- Configure Vercel to deploy `staging` branch to staging environment
- `main` branch → production (when ready)

**Option 2: Same Branch, Different Projects**

- Create two Vercel projects
- One for staging, one for production
- Both deploy from `main` branch
- Use environment variables to differentiate

## Environment Variables Checklist

**Required for Staging:**

- ✅ `NEXT_PUBLIC_APP_ENV=staging`

**Optional (if needed):**

- `NEXT_PUBLIC_GRAPH_URL` (subgraph URL)
- `NEXT_PUBLIC_MAINNET_RPC_URL` (custom RPC)
- `NEXT_PUBLIC_BASE_RPC_URL` (custom RPC)

## Testing Checklist

- [ ] DNS resolves: `nslookup staging.app.harborfinance.io`
- [ ] SSL certificate active (🔒 in browser)
- [ ] App loads correctly
- [ ] Environment variables work
- [ ] Wallet connections work
- [ ] All features functional

## Common Issues

**"Domain not found"**
→ Wait for DNS propagation (5-48 hours, usually 15-30 min)

**"SSL certificate pending"**
→ Wait 5-10 minutes after DNS resolves

**"Build failed"**
→ Check Vercel build logs, verify environment variables

## Next Steps

1. ✅ Staging is live at `staging.app.harborfinance.io`
2. Update landing page (`harborfinance.io`) with "App" button
3. When ready, set up `app.harborfinance.io` for production
