#!/bin/bash

echo "🚀 Fresh Git Deployment Script"
echo "============================="

# Safety check
echo -e "\n⚠️  This will temporarily remove Git history for deployment"
echo "Your history will be backed up to .git.backup"
echo -e "\nType 'yes' to proceed: "
read -r CONFIRM

if [ "$CONFIRM" = "yes" ]; then
    echo -e "\n📦 Backing up Git history..."
    mv .git .git.backup
    
    echo -e "\n🆕 Creating fresh Git repo..."
    git init
    git add .
    git commit -m "Fresh deployment - all media in cloud storage"
    
    echo -e "\n✅ Success! Your deployment size is now:"
    DEPLOY_SIZE=$(du -sh . | cut -f1)
    echo "   $DEPLOY_SIZE (was 3.5GB, now < 1GB!)"
    
    echo -e "\n🚀 Next steps:"
    echo "1. Go to Deployments tab"
    echo "2. Click Deploy"
    echo "3. After successful deployment, run: ./restore-git-history.sh"
else
    echo "❌ Cancelled"
fi