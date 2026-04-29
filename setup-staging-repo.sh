#!/bin/bash

# Script to set up staging repository
# Run this after creating the GitHub repository

echo "🚀 Harbor App Staging Repository Setup"
echo "======================================"
echo ""

# Check if staging remote already exists
if git remote | grep -q "^staging$"; then
    echo "⚠️  Staging remote already exists"
    read -p "Do you want to remove it and add a new one? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git remote remove staging
    else
        echo "Keeping existing staging remote"
        exit 0
    fi
fi

# Get repository URL from user
echo "📦 Enter your new staging repository URL:"
echo "   Example: https://github.com/baofinance/harbor-app-staging.git"
read -p "Repository URL: " REPO_URL

if [ -z "$REPO_URL" ]; then
    echo "❌ Repository URL is required"
    exit 1
fi

# Add staging remote
echo ""
echo "➕ Adding staging remote..."
git remote add staging "$REPO_URL"

# Verify remote was added
if git remote | grep -q "^staging$"; then
    echo "✅ Staging remote added successfully"
else
    echo "❌ Failed to add staging remote"
    exit 1
fi

# Push staging branch
echo ""
echo "📤 Pushing staging branch to new repository..."
git push staging staging

# Ask if they want to also push main
read -p "Do you want to also push main branch to staging repo? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📤 Pushing main branch to staging repository..."
    git push staging main:main
fi

# Show remotes
echo ""
echo "📋 Current remotes:"
git remote -v

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Go to Vercel and import the new repository"
echo "2. Add environment variable: NEXT_PUBLIC_APP_ENV=staging"
echo "3. Add custom domain: staging.app.harborfinance.io"
echo "4. Configure DNS in GoDaddy (see docs/VERCEL_QUICK_START.md)"

