#!/bin/bash

# Script to copy environment variables from staging to production Vercel project
# Usage: ./copy-env-vars.sh

set -e

echo "🚀 Vercel Environment Variables Copy Script"
echo "=========================================="
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI is not installed. Install it with: npm i -g vercel"
    exit 1
fi

echo "📋 Step 1: Pulling environment variables from STAGING project..."
echo "   (You'll be prompted to select your staging project)"
echo ""

# Pull staging environment variables
vercel env pull .env.staging --environment=production

if [ ! -f .env.staging ]; then
    echo "❌ Failed to pull staging environment variables"
    exit 1
fi

echo ""
echo "✅ Staging environment variables saved to .env.staging"
echo ""

# Show what we got
echo "📝 Environment variables found:"
grep -E "^NEXT_PUBLIC_|^[A-Z_]+=" .env.staging | sed 's/=.*/=***/' || echo "   (No variables found)"
echo ""

# Ask for confirmation
read -p "📤 Ready to push to PRODUCTION project? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cancelled. Staging variables are saved in .env.staging"
    echo "   You can manually review and edit them before pushing."
    exit 0
fi

echo ""
echo "📤 Step 2: Pushing environment variables to PRODUCTION project..."
echo "   (You'll be prompted to select your production project)"
echo ""

# Check if vercel-env-push is available, if not install it
if ! command -v vercel-env-push &> /dev/null; then
    echo "📦 Installing vercel-env-push..."
    npm install -g vercel-env-push
fi

# Push to production
npx vercel-env-push .env.staging production

echo ""
echo "✅ Environment variables pushed to production!"
echo ""
echo "⚠️  IMPORTANT: Remember to change NEXT_PUBLIC_APP_ENV from 'staging' to 'production'"
echo "   in your Vercel dashboard: Settings → Environment Variables"
echo ""
echo "🧹 Cleaning up..."
rm -f .env.staging
echo "✅ Done!"

