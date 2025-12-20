# Deploy to app.harborfinance.io - Production Guide

This guide will help you deploy the Harbor app from the `main` branch to `app.harborfinance.io` using Vercel and GoDaddy.

## Prerequisites

- ✅ GitHub repository: `baofinance/harbor-app`
- ✅ GoDaddy account with `harborfinance.io` domain
- ✅ Vercel account (sign up at [vercel.com](https://vercel.com) if needed)

## Step 1: Create Vercel Project

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Add New Project"** or **"New Project"**
3. Import your GitHub repository:
   - Select **"Import Git Repository"**
   - Choose `baofinance/harbor-app`
   - If not visible, click **"Adjust GitHub App Permissions"** and grant access
4. Configure the project:
   - **Project Name**: `harbor-app-production` (or `harbor-app`)
   - **Framework Preset**: Next.js (should auto-detect)
   - **Root Directory**: `./` (leave as default)
   - **Build Command**: `npm run build` (should auto-detect)
   - **Output Directory**: `.next` (should auto-detect)
   - **Install Command**: `npm install` (should auto-detect)
5. **IMPORTANT**: Set the branch to deploy:
   - Under **"Production Branch"**, select `main`
   - This ensures production deploys from `main` branch
6. Click **"Deploy"** (don't worry about environment variables yet)

## Step 2: Configure Environment Variables

After the initial deployment, configure environment variables:

1. In your Vercel project, go to **Settings** → **Environment Variables**
2. Add the following variables:

### Required Environment Variables:

```
NEXT_PUBLIC_APP_ENV = production
```

### Optional (if you have custom configurations):

```
NEXT_PUBLIC_GRAPH_URL = [your subgraph URL]
NEXT_PUBLIC_MAINNET_RPC_URL = [your RPC URL]
NEXT_PUBLIC_BASE_RPC_URL = [your RPC URL]
```

3. Make sure to select **"Production"** environment for each variable
4. Click **"Save"**

## Step 3: Add Custom Domain in Vercel

1. In your Vercel project, go to **Settings** → **Domains**
2. Click **"Add Domain"**
3. Enter: `app.harborfinance.io`
4. Click **"Add"**
5. Vercel will show you DNS configuration instructions:
   - **Type**: CNAME
   - **Name**: `app`
   - **Value**: `cname.vercel-dns.com` (or similar - Vercel will show the exact value)
   - **TTL**: 600 (or default)

**Copy the exact CNAME value from Vercel** - it might be something like:
- `cname.vercel-dns.com`
- Or a specific Vercel domain like `cname-xyz.vercel-dns.com`

## Step 4: Configure DNS in GoDaddy

1. Log in to your GoDaddy account
2. Go to **My Products** → **Domains**
3. Find `harborfinance.io` and click **"DNS"** or **"Manage DNS"**
4. Add a new DNS record:
   - **Type**: CNAME
   - **Name**: `app` (just `app`, not `app.harborfinance.io`)
   - **Value**: Paste the CNAME value from Vercel (e.g., `cname.vercel-dns.com`)
   - **TTL**: 600 seconds (or 1 hour)
5. Click **"Save"** or **"Add Record"**

### Important Notes:
- The **Name** field should be just `app` (not `app.harborfinance.io`)
- GoDaddy will automatically append `harborfinance.io` to create `app.harborfinance.io`
- If you see an existing `app` record, you may need to edit or delete it first

## Step 5: Wait for DNS Propagation

1. DNS changes can take **5 minutes to 48 hours** to propagate
2. Usually takes **15-30 minutes** for most users
3. You can check DNS propagation:
   ```bash
   # In terminal, run:
   nslookup app.harborfinance.io
   # or
   dig app.harborfinance.io
   ```
4. Or use online tools:
   - [whatsmydns.net](https://www.whatsmydns.net/#CNAME/app.harborfinance.io)
   - [dnschecker.org](https://dnschecker.org/#CNAME/app.harborfinance.io)

## Step 6: SSL Certificate

1. Vercel automatically provisions SSL certificates via Let's Encrypt
2. After DNS propagates, Vercel will automatically:
   - Detect the domain is pointing to Vercel
   - Issue an SSL certificate (takes 5-10 minutes)
   - Enable HTTPS
3. You'll see a green checkmark in Vercel → Settings → Domains when ready

## Step 7: Verify Deployment

1. Once DNS and SSL are ready, visit: `https://app.harborfinance.io`
2. Check that:
   - ✅ Site loads correctly
   - ✅ SSL certificate is active (🔒 in browser)
   - ✅ All features work (wallet connection, etc.)
   - ✅ Environment variables are correct

## Step 8: Automatic Deployments

Vercel will automatically deploy when you push to `main`:

```bash
# Make changes
git checkout main
# ... make your changes ...
git add .
git commit -m "Your changes"
git push origin main
```

Vercel will:
1. Detect the push to `main`
2. Start a new build
3. Deploy automatically
4. Your site will update at `app.harborfinance.io`

## Troubleshooting

### "Domain not found" or "DNS not configured"
- Wait longer for DNS propagation (can take up to 48 hours)
- Double-check the CNAME record in GoDaddy matches Vercel's instructions exactly
- Verify the Name field is just `app` (not `app.harborfinance.io`)

### "SSL certificate pending"
- Wait 5-10 minutes after DNS resolves
- Make sure DNS is pointing to Vercel correctly
- Check Vercel → Settings → Domains for status

### "Build failed"
- Check Vercel build logs: Project → Deployments → Click on failed deployment
- Verify environment variables are set correctly
- Make sure `main` branch builds successfully locally: `npm run build`

### "Site loads but shows wrong content"
- Check that Vercel is deploying from `main` branch
- Verify environment variables are set for Production environment
- Clear browser cache and try again

### GoDaddy doesn't allow `app` as subdomain
- Some GoDaddy configurations require using `app-harbor` or similar
- If needed, use a different subdomain name and update Vercel accordingly

## DNS Record Summary

**In GoDaddy:**
```
Type: CNAME
Name: app
Value: [CNAME value from Vercel, e.g., cname.vercel-dns.com]
TTL: 600
```

**Result:**
- `app.harborfinance.io` → Points to Vercel
- Vercel handles SSL and routing

## Next Steps After Deployment

1. ✅ Test all features on production domain
2. ✅ Update any hardcoded URLs in the codebase
3. ✅ Set up monitoring/alerts (optional)
4. ✅ Document the production URL for the team
5. ✅ Consider setting up a staging environment at `staging.app.harborfinance.io` (see VERCEL_QUICK_START.md)

## Support

- Vercel Docs: [vercel.com/docs](https://vercel.com/docs)
- GoDaddy DNS Help: [godaddy.com/help](https://www.godaddy.com/help)
- Check Vercel deployment logs for build errors

