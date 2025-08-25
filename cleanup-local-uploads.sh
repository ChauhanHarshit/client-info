#!/bin/bash

echo "🧹 Local Uploads Cleanup Script"
echo "=============================="

# Safety check - verify S3 migration completed
TOTAL_FILES=$(find uploads -type f | wc -l)
UPLOADED=$(grep -c "s3" s3-migration-backup.json 2>/dev/null || echo "0")

echo "📊 Status:"
echo "Total files: $TOTAL_FILES"
echo "Uploaded to S3: $UPLOADED"

if [ "$UPLOADED" -lt "$TOTAL_FILES" ]; then
    echo "⚠️  WARNING: Not all files have been uploaded to S3!"
    echo "Please complete migration before cleanup."
    exit 1
fi

# Create a backup list of what we're removing
echo -e "\n📋 Creating cleanup list..."
find uploads -type f > cleanup-list.txt
echo "Saved list of $(wc -l < cleanup-list.txt) files to cleanup-list.txt"

# Show what will be freed
echo -e "\n💾 Space to be freed:"
du -sh uploads

echo -e "\n⚠️  This will DELETE all local files in uploads directory!"
echo "The files are already backed up to S3."
echo -e "\nType 'yes' to proceed with cleanup: "
read -r CONFIRM

if [ "$CONFIRM" = "yes" ]; then
    echo -e "\n🗑️  Removing local files..."
    find uploads -type f -delete
    echo "✅ Local files removed!"
    
    echo -e "\n📊 New project size:"
    du -sh .
    
    # Check if under limit
    TOTAL_SIZE=$(du -s . 2>/dev/null | cut -f1)
    if [ "$TOTAL_SIZE" -lt 7340032 ]; then
        echo -e "\n✅ SUCCESS: Project is now UNDER Replit's 7GB limit!"
        echo "🚀 Ready for deployment!"
    else
        echo -e "\n⚠️  Project still exceeds limit. Check other directories."
    fi
else
    echo "❌ Cleanup cancelled."
fi