#!/bin/bash

echo "🔄 Git History Restore Script"
echo "============================"

# Check if backup exists
if [ ! -d ".git.backup" ]; then
    echo "❌ No .git.backup found. Nothing to restore."
    exit 1
fi

echo -e "\n⚠️  This will restore your original Git history"
echo "Type 'yes' to proceed: "
read -r CONFIRM

if [ "$CONFIRM" = "yes" ]; then
    echo -e "\n🗑️  Removing temporary Git..."
    rm -rf .git
    
    echo -e "\n📦 Restoring original Git history..."
    mv .git.backup .git
    
    echo -e "\n✅ Git history restored!"
    echo "Your project now has full Git history again."
else
    echo "❌ Cancelled"
fi