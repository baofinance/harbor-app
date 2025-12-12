# Create Staging Repository - Step by Step

## Option 1: Create New Repository on GitHub (Recommended)

### Step 1: Create Repository on GitHub

1. Go to [GitHub](https://github.com) and log in
2. Click the **"+"** icon in the top right → **"New repository"**
3. Fill in the details:
   - **Repository name**: `harbor-app-staging` (or `harbor-app-staging-env`)
   - **Description**: "Staging environment for Harbor App"
   - **Visibility**: Private (recommended) or Public
   - **DO NOT** initialize with README, .gitignore, or license (we'll push existing code)
4. Click **"Create repository"**

### Step 2: Add New Remote and Push

After creating the repo, GitHub will show you commands. Run these in your terminal:

```bash
# Add the new staging repository as a remote
git remote add staging https://github.com/baofinance/harbor-app-staging.git

# Push the staging branch to the new repository
git push staging staging

# Set staging branch as default in the new repo
git push staging staging:main
```

Or if you want to push main branch to the staging repo:

```bash
# Push main branch to staging repo (as main branch)
git push staging main:main

# Also push staging branch
git push staging staging
```

### Step 3: Verify

```bash
# Check remotes
git remote -v

# You should see:
# origin    https://github.com/baofinance/harbor-app/ (fetch)
# origin    https://github.com/baofinance/harbor-app/ (push)
# staging   https://github.com/baofinance/harbor-app-staging.git (fetch)
# staging   https://github.com/baofinance/harbor-app-staging.git (push)
```

## Option 2: Use Same Repo with Staging Branch (Simpler)

If you prefer to keep everything in one repository:

1. The staging branch is already created
2. Push it to the existing repo:
   ```bash
   git push origin staging
   ```
3. In Vercel, configure to deploy from the `staging` branch

## Recommended: Separate Staging Repository

**Benefits:**
- ✅ Clear separation between production and staging
- ✅ Independent deployment cycles
- ✅ Can have different collaborators/permissions
- ✅ Easier to test without affecting production

**Setup:**
- Follow Option 1 above
- Connect the new `harbor-app-staging` repo to Vercel
- Deploy from the `staging` branch (or `main` if you push main there)

## Quick Commands (After Creating Repo)

Once you've created the GitHub repository, run these commands:

```bash
# Navigate to project
cd /Users/andrewyoung/Harbor-App/harbor-app

# Add staging remote (replace URL with your actual repo URL)
git remote add staging https://github.com/baofinance/harbor-app-staging.git

# Push staging branch
git push staging staging

# Optional: Also set main branch in staging repo
git push staging main:main
```

## Next Steps After Repository is Created

1. ✅ Repository created on GitHub
2. ✅ Code pushed to staging repository
3. Connect to Vercel:
   - Go to Vercel → Add New Project
   - Import `harbor-app-staging` repository
   - Configure environment variables
   - Add custom domain: `staging.app.harborfinance.io`
4. Configure DNS in GoDaddy (see VERCEL_QUICK_START.md)

