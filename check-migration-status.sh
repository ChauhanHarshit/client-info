#!/bin/bash

echo "🚀 S3 Migration Status Check"
echo "============================"

# Check if migration is running
if ps aux | grep -E "node.*migrate-uploads-to-s3" | grep -v grep > /dev/null; then
    echo "✅ Migration is RUNNING"
else
    echo "❌ Migration is NOT running"
fi

# Check progress
echo -e "\n📊 Progress:"
TOTAL_FILES=$(find uploads -type f | wc -l)
PROCESSED=$(cat migration-progress.json 2>/dev/null | wc -l)
UPLOADED=$(cat s3-migration-backup.json 2>/dev/null | grep -c "s3")

echo "Total files: $TOTAL_FILES"
echo "Processed: $PROCESSED"
echo "Successfully uploaded: $UPLOADED"

# Check creator profile pictures
echo -e "\n👤 Creator Profile Pictures Status:"
creators=("1752350883406-dandangler" "1752350876970-V" "1752350866909-essie" "1752350860993-lala" "1752350855058-bronwin" "1752350847692-trippiebri")

for creator in "${creators[@]}"; do
    file_id=$(echo $creator | cut -d'-' -f1)
    name=$(echo $creator | cut -d'-' -f2)
    
    if grep -q "$file_id" s3-migration-backup.json 2>/dev/null; then
        echo "✅ $name - Uploaded"
    else
        echo "⏳ $name - Pending"
    fi
done

# Show last uploaded file
echo -e "\n📄 Last uploaded file:"
tail -2 s3-migration-backup.json 2>/dev/null | head -1 | grep -o '"local": "[^"]*"' | cut -d'"' -f4

echo -e "\n💡 Run this script again to check updated status"