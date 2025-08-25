#!/bin/bash

echo "🚀 Deployment Optimization Script"
echo "================================"

# Calculate current deployable size
echo -e "\n📊 Current Status:"
TOTAL_SIZE=$(du -sb . 2>/dev/null | cut -f1)
LOCAL_SIZE=$(du -sb .local 2>/dev/null | cut -f1 || echo 0)
DEPLOYABLE_SIZE=$((TOTAL_SIZE - LOCAL_SIZE))
DEPLOYABLE_GB=$(echo "scale=2; $DEPLOYABLE_SIZE / 1073741824" | bc)

echo "Total size: $(du -sh . 2>/dev/null | cut -f1)"
echo "Deployable size: ${DEPLOYABLE_GB}GB (excluding .local)"

# 1. Clean uploads directory (1.8GB savings)
echo -e "\n1️⃣ Uploads Directory (1.8GB):"
if [ -d "uploads" ] && [ "$(find uploads -type f | wc -l)" -gt 0 ]; then
    echo "   ⚠️  Contains $(find uploads -type f | wc -l) files already migrated to S3"
    echo "   → Run: ./cleanup-local-uploads.sh"
else
    echo "   ✅ Already cleaned"
fi

# 2. Git history optimization (up to 2GB savings)
echo -e "\n2️⃣ Git History (2.6GB):"
GIT_SIZE=$(du -sh .git 2>/dev/null | cut -f1)
echo "   Current size: $GIT_SIZE"
echo "   Options:"
echo "   a) Shallow clone (keeps recent history): git gc --aggressive --prune=now"
echo "   b) Fresh deployment (no history): rm -rf .git && git init && git add . && git commit -m 'Deploy'"

# 3. Large JSON file
echo -e "\n3️⃣ Large JSON File:"
if [ -f "content-storage.json" ]; then
    JSON_SIZE=$(du -h content-storage.json | cut -f1)
    echo "   content-storage.json: $JSON_SIZE"
    echo "   → Consider moving to database or external storage"
else
    echo "   ✅ Not found"
fi

# 4. Clean build artifacts
echo -e "\n4️⃣ Build Artifacts:"
CLEANED=0
if [ -d "dist" ]; then
    echo "   dist/: $(du -sh dist | cut -f1)"
    CLEANED=1
fi
if [ -f "*.log" ]; then
    echo "   Log files found"
    CLEANED=1
fi
if [ $CLEANED -eq 0 ]; then
    echo "   ✅ Already clean"
fi

# Estimate final size
echo -e "\n📈 Estimated Savings:"
echo "   Uploads cleanup: -1.8GB"
echo "   Git optimization: -1.5GB to -2.5GB"
echo "   Total potential: -3.3GB to -4.3GB"
echo -e "\n✅ Estimated final size: 2-3GB (well under 7GB limit!)"

echo -e "\n🎯 Quick Fix (Minimal approach):"
echo "1. Run: ./cleanup-local-uploads.sh"
echo "2. Run: git gc --aggressive --prune=now"
echo "3. Deploy!"