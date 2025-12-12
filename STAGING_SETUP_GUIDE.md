# Staging Environment Setup Guide

This guide will help you set up a staging environment for Harbor App at `staging.harborfinance.io` and `staging.app.harborfinance.io` using Vercel and GoDaddy.

## Overview

- **Landing Page**: `harborfinance.io` (already live)
- **Staging Landing**: `staging.harborfinance.io` (to be set up)
- **Staging App**: `staging.app.harborfinance.io` (to be set up)
- **Production App**: `app.harborfinance.io` (future)

## Prerequisites

- GitHub repository access
- Vercel account (connected to GitHub)
- GoDaddy account with DNS access for `harborfinance.io`

## Step 1: Vercel Project Setup

### 1.1 Create Staging Project in Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository (`baofinance/harbor-app`)
4. Configure the project:
   - **Project Name**: `harbor-app-staging` (or your preferred name)
   - **Framework Preset**: Next.js (should auto-detect)
   - **Root Directory**: `./` (root of the repo)
   - **Build Command**: `npm run build` (or `yarn build`)
   - **Output Directory**: `.next` (default for Next.js)
   - **Install Command**: `npm install` (or `yarn install`)

### 1.2 Configure Environment Variables

In Vercel project settings, add these environment variables:

**For Staging Environment:**
```
NEXT_PUBLIC_APP_ENV=staging
NODE_ENV=production
```

**Additional variables you may need:**
- `NEXT_PUBLIC_GRAPH_URL` (if using subgraph)
- `NEXT_PUBLIC_MAINNET_RPC_URL` (if custom RPC)
- `NEXT_PUBLIC_BASE_RPC_URL` (if custom RPC)
- Any other environment-specific variables

### 1.3 Configure Branch Deployments

1. Go to **Settings** → **Git**
2. Under **Production Branch**, set to `main` (or your production branch)
3. Under **Preview Branches**, enable automatic deployments
4. Create a **staging branch** in GitHub:
   ```bash
   git checkout -b staging
   git push origin staging
   ```

### 1.4 Set Up Staging Branch Deployment

1. In Vercel, go to **Settings** → **Git**
2. Add a new branch deployment:
   - **Branch**: `staging`
   - **Environment**: Production (or create a custom environment)
3. This will create a deployment URL like: `harbor-app-staging-xyz.vercel.app`

## Step 2: Custom Domain Configuration in Vercel

### 2.1 Add staging.harborfinance.io

1. In Vercel project, go to **Settings** → **Domains**
2. Click **"Add Domain"**
3. Enter: `staging.harborfinance.io`
4. Vercel will show you DNS records to add (see Step 3)

### 2.2 Add staging.app.harborfinance.io

1. In the same **Settings** → **Domains** section
2. Click **"Add Domain"** again
3. Enter: `staging.app.harborfinance.io`
4. Vercel will show you DNS records to add

**Note**: You can also use a single project with multiple domains, or create separate projects for landing and app.

## Step 3: DNS Configuration in GoDaddy

### 3.1 Access DNS Management

1. Log in to [GoDaddy](https://www.godaddy.com)
2. Go to **My Products** → **Domains**
3. Find `harborfinance.io` and click **DNS** or **Manage DNS**

### 3.2 Add DNS Records for staging.harborfinance.io

Vercel will provide you with specific DNS records. Typically, you'll need:

**Option A: Using CNAME (Recommended)**
```
Type: CNAME
Name: staging
Value: cname.vercel-dns.com
TTL: 600 (or Auto)
```

**Option B: Using A Record (if CNAME not supported)**
```
Type: A
Name: staging
Value: [IP address from Vercel]
TTL: 600
```

### 3.3 Add DNS Records for staging.app.harborfinance.io

```
Type: CNAME
Name: staging.app
Value: cname.vercel-dns.com
TTL: 600
```

**Note**: Some DNS providers require the full subdomain. If `staging.app` doesn't work, you may need to create:
- `staging-app` as the subdomain, then configure it in Vercel

### 3.4 DNS Propagation

- DNS changes can take 5 minutes to 48 hours to propagate
- Typically takes 15-30 minutes
- Use [whatsmydns.net](https://www.whatsmydns.net) to check propagation

## Step 4: Update Next.js Configuration

The `next.config.js` already has environment detection. Ensure it's configured correctly:

```javascript
basePath: process.env.NEXT_PUBLIC_APP_ENV === "staging" ? "/staging" : "",
```

**Important**: If you want staging to work without a basePath (so `staging.app.harborfinance.io` works directly), you can remove or modify this line.

### Recommended Configuration

For separate staging domains, you might want:

```javascript
basePath: "", // No basePath needed for separate domains
```

Or keep it if you want staging under a path on the main domain.

## Step 5: Deploy to Staging

### 5.1 Deploy via Git Push

```bash
# Create and switch to staging branch
git checkout -b staging

# Make any staging-specific changes
# (environment variables are set in Vercel)

# Push to trigger deployment
git push origin staging
```

### 5.2 Deploy via Vercel CLI (Alternative)

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy to staging
vercel --prod --env NEXT_PUBLIC_APP_ENV=staging
```

## Step 6: Update Landing Page (harborfinance.io)

If your landing page is in a separate repository or needs updating:

1. Add an "App" button that links to:
   - **Staging**: `https://staging.app.harborfinance.io`
   - **Production** (future): `https://app.harborfinance.io`

2. Example button code:
```html
<a href="https://staging.app.harborfinance.io" 
   class="app-button">
  Launch App
</a>
```

## Step 7: Verification

### 7.1 Test Staging URLs

1. Visit `https://staging.harborfinance.io` (if configured)
2. Visit `https://staging.app.harborfinance.io`
3. Verify all features work correctly
4. Check that environment variables are loaded correctly

### 7.2 Check SSL Certificates

- Vercel automatically provisions SSL certificates via Let's Encrypt
- Should be active within a few minutes of DNS propagation
- Check in browser: URL should show 🔒 (secure)

## Troubleshooting

### DNS Not Resolving

1. Check DNS records in GoDaddy match Vercel's requirements
2. Wait for DNS propagation (can take up to 48 hours)
3. Clear DNS cache: `sudo dscacheutil -flushcache` (Mac) or `ipconfig /flushdns` (Windows)

### SSL Certificate Issues

1. Ensure DNS is properly configured
2. Wait 5-10 minutes after DNS propagation
3. Check Vercel dashboard for certificate status
4. Contact Vercel support if issues persist

### Build Failures

1. Check Vercel build logs
2. Ensure all environment variables are set
3. Verify `package.json` scripts are correct
4. Check Node.js version compatibility

### Environment Variables Not Working

1. Ensure variables are prefixed with `NEXT_PUBLIC_` for client-side access
2. Redeploy after adding new environment variables
3. Check variable names match exactly (case-sensitive)

## Future: Production App Setup

When ready for production:

1. Create production project in Vercel (or use same project with production branch)
2. Add domain: `app.harborfinance.io`
3. Configure DNS in GoDaddy
4. Update landing page button to point to production URL
5. Set `NEXT_PUBLIC_APP_ENV=production` in Vercel

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Custom Domains](https://vercel.com/docs/concepts/projects/domains)
- [GoDaddy DNS Help](https://www.godaddy.com/help)
- [Next.js Deployment](https://nextjs.org/docs/deployment)

## Quick Reference

**Staging URLs:**
- `staging.harborfinance.io` → Staging landing (if separate)
- `staging.app.harborfinance.io` → Staging app

**Production URLs:**
- `harborfinance.io` → Production landing (existing)
- `app.harborfinance.io` → Production app (future)

**Vercel Dashboard:**
- Project: `harbor-app-staging`
- Branch: `staging` (for staging deployments)
- Branch: `main` (for production deployments)

