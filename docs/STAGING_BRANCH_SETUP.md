# Staging Branch Setup - Simple Approach

## ✅ Recommended: Use Staging Branch (No Separate Repo Needed)

This is the **simplest approach** - use a `staging` branch in your existing repository.

## Current Status

✅ **Staging branch already created and pushed to GitHub**
- Branch: `staging`
- Location: `https://github.com/baofinance/harbor-app/tree/staging`
- Contains all staging configuration files

## Setup Steps

### 1. Create Vercel Project for Staging (5 minutes)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Import repository: `baofinance/harbor-app`
4. Configure:
   - **Project Name**: `harbor-app-staging`
   - **Framework**: Next.js (auto-detected)
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

### 2. Configure Branch Deployment

1. In Vercel project settings, go to **Settings** → **Git**
2. Under **Production Branch**, you can:
   - **Option A**: Set to `staging` (staging branch becomes production for this project)
   - **Option B**: Keep `main`, but add branch deployment for `staging`

**Recommended: Option A**
- Set Production Branch to `staging`
- This means every push to `staging` branch will deploy to your staging domain

### 3. Add Environment Variables

In Vercel project → **Settings** → **Environment Variables**:

```
NEXT_PUBLIC_APP_ENV = staging
```

Add this for:
- ✅ Production (since staging branch is your "production" for this project)
- ✅ Preview (optional, for PR previews)

### 4. Add Custom Domain

1. In Vercel project → **Settings** → **Domains**
2. Click **"Add Domain"**
3. Enter: `staging.app.harborfinance.io`
4. Vercel will show DNS instructions

### 5. Configure DNS in GoDaddy

1. Go to GoDaddy → **My Products** → **Domains** → `harborfinance.io` → **DNS**
2. Add CNAME record:
   ```
   Type: CNAME
   Name: staging.app
   Value: [Vercel will provide - usually cname.vercel-dns.com]
   TTL: 600
   ```

**Note**: If GoDaddy doesn't support `staging.app` as a subdomain, use `staging-app` instead.

### 6. Deploy!

The staging branch is already pushed, so Vercel should automatically:
1. Detect the project
2. Build from the `staging` branch
3. Deploy to `staging.app.harborfinance.io`

## Workflow

### Making Changes to Staging

```bash
# Switch to staging branch
git checkout staging

# Make your changes
# ... edit files ...

# Commit and push
git add .
git commit -m "feat: add new feature"
git push origin staging

# Vercel will automatically deploy!
```

### Syncing Changes from Main to Staging

```bash
# Switch to staging
git checkout staging

# Merge latest from main
git merge main

# Push to trigger deployment
git push origin staging
```

### Creating New Features

```bash
# Create feature branch from staging
git checkout staging
git checkout -b feature/new-feature

# Make changes, commit
git add .
git commit -m "feat: new feature"

# Push and create PR to staging branch
git push origin feature/new-feature
# Then create PR on GitHub: feature/new-feature → staging
```

## Future: Production Setup

When ready for production:

1. Create **another Vercel project** (or use same project with different branch)
2. Connect to same repository: `baofinance/harbor-app`
3. Set Production Branch to `main`
4. Add domain: `app.harborfinance.io`
5. Configure DNS for `app.harborfinance.io`

**Result:**
- `staging.app.harborfinance.io` → staging branch
- `app.harborfinance.io` → main branch

## Benefits of This Approach

✅ **Simple** - No separate repository to manage  
✅ **Easy sync** - Merge changes from main to staging easily  
✅ **Same codebase** - All code in one place  
✅ **Branch protection** - Can set up branch rules on GitHub  
✅ **Preview deployments** - Vercel creates previews for PRs  

## Quick Commands Reference

```bash
# Switch to staging
git checkout staging

# Update staging from main
git checkout staging
git merge main
git push origin staging

# Create feature branch
git checkout staging
git checkout -b feature/my-feature

# Deploy to staging (automatic on push)
git push origin staging
```

## Troubleshooting

**Vercel not deploying from staging branch?**
- Check Settings → Git → Production Branch is set to `staging`
- Verify branch exists: `git branch -a | grep staging`

**Changes not showing?**
- Check Vercel deployment logs
- Verify environment variables are set
- Clear browser cache

**DNS not working?**
- Wait 15-30 minutes for propagation
- Verify CNAME record in GoDaddy
- Check DNS with: `nslookup staging.app.harborfinance.io`

