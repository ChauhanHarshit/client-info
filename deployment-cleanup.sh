#!/bin/bash

echo "🧹 Deployment Cleanup Script"
echo "============================"
echo ""
echo "This script will clean up your project for successful deployment."
echo "Current project size: $(du -sh . | cut -f1)"
echo ""

# Function to safely remove files/directories
safe_remove() {
    if [ -e "$1" ]; then
        rm -rf "$1"
        echo "✓ Removed: $1"
    fi
}

# Step 1: Remove documentation files
echo "📄 Step 1: Removing unnecessary documentation files..."
for file in DEPLOYMENT*.md *_DEPLOY*.md *_FIX*.md PRODUCTION_*.md EMERGENCY_*.js GIT*.js admin_cookies.txt *.zip Screenshot*.png; do
    safe_remove "$file"
done

# Step 2: Clean up attached_assets (now that S3 is configured)
echo ""
echo "🗑️  Step 2: Cleaning up local assets (S3 is now configured)..."
if [ -d "attached_assets" ]; then
    ASSETS_SIZE=$(du -sh attached_assets/ | cut -f1)
    echo "   Found attached_assets directory: $ASSETS_SIZE"
    echo "   These files should now be uploaded to S3 instead of stored locally."
    
    # Create a backup list of files before deletion
    echo "   Creating file list for reference..."
    ls -la attached_assets/ > attached_assets_list.txt
    echo "   File list saved to: attached_assets_list.txt"
    
    # Remove the directory
    rm -rf attached_assets/
    echo "✓ Removed attached_assets directory"
fi

# Step 3: Clean up animations directory if it exists
if [ -d "animations" ]; then
    ANIM_SIZE=$(du -sh animations/ | cut -f1)
    echo ""
    echo "   Found animations directory: $ANIM_SIZE"
    rm -rf animations/
    echo "✓ Removed animations directory"
fi

# Step 4: Clean up any backup files
echo ""
echo "🗄️  Step 3: Cleaning up backup files..."
safe_remove "backups"
safe_remove "*.sql"
safe_remove "*.log"

# Step 5: Clean up test files
echo ""
echo "🧪 Step 4: Cleaning up test files..."
safe_remove "test-s3-connection.js"
safe_remove "fix-s3-configuration.md"
safe_remove "deployment-fix.sh"

# Step 6: Show final size
echo ""
echo "============================"
echo "✅ Cleanup Complete!"
echo ""
echo "Final project size: $(du -sh . | cut -f1)"
echo "Essential directories:"
echo "  - client: $(du -sh client/ | cut -f1)"
echo "  - server: $(du -sh server/ | cut -f1)"
echo "  - node_modules: $(du -sh node_modules/ | cut -f1)"
echo ""
echo "Your project is now ready for deployment!"
echo ""
echo "⚠️  Important: New uploads will now go to S3 automatically."
echo "   The local 'uploads/' directory is still needed for existing files"
echo "   that haven't been migrated yet."