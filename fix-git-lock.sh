#!/bin/bash

# Git Lock Resolution Script
# This script will force-resolve the Git state blocking your deployment

echo "🔧 Starting Git lock resolution..."

# Remove any Git lock files
echo "Removing Git lock files..."
rm -f .git/index.lock
rm -f .git/HEAD.lock
rm -f .git/config.lock
rm -f .git/refs/heads/*.lock

# Reset Git state
echo "Resetting Git state..."
git reset --hard HEAD

# Fetch latest from remote
echo "Fetching from remote..."
git fetch origin

# Check current branch
CURRENT_BRANCH=$(git branch --show-current)
echo "Current branch: $CURRENT_BRANCH"

# Force sync with remote
echo "Force syncing with remote..."
git reset --hard origin/$CURRENT_BRANCH

# Clean any untracked files
echo "Cleaning untracked files..."
git clean -fd

# Check status
echo "Final Git status:"
git status

echo "✅ Git lock resolution complete"
echo "You should now be able to push/pull normally"