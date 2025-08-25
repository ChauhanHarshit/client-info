#!/bin/bash

# Complete Git Resolution Script for Replit
# Fixes Git lock, merge conflicts, and sync issues

set -e

echo "Starting complete Git resolution..."

# Function to safely remove lock files
cleanup_locks() {
    echo "Cleaning up Git lock files..."
    find .git -name "*.lock" -type f -delete 2>/dev/null || true
    rm -f .git/index.lock .git/HEAD.lock .git/config.lock 2>/dev/null || true
}

# Function to handle merge conflicts
resolve_conflicts() {
    echo "Checking for merge conflicts..."
    if git status | grep -q "both modified\|both added\|both deleted"; then
        echo "Resolving merge conflicts by accepting remote changes..."
        git checkout --theirs .
        git add .
    fi
}

# Function to clean Git state
clean_git_state() {
    echo "Cleaning Git state..."
    git reset --hard HEAD 2>/dev/null || true
    git clean -fd 2>/dev/null || true
}

# Main execution
main() {
    # Step 1: Remove locks
    cleanup_locks
    
    # Step 2: Clean current state
    clean_git_state
    
    # Step 3: Fetch remote
    echo "Fetching from remote..."
    git fetch --all --prune
    
    # Step 4: Get current branch
    BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")
    echo "Current branch: $BRANCH"
    
    # Step 5: Handle conflicts and reset to remote
    resolve_conflicts
    
    echo "Resetting to match remote..."
    git reset --hard origin/$BRANCH
    
    # Step 6: Final cleanup
    git clean -fd
    
    # Step 7: Verify status
    echo "Final Git status:"
    git status --porcelain
    
    echo "Git resolution complete. You can now push/pull normally."
    echo "To push your changes: git add . && git commit -m 'Production authentication fix' && git push"
}

# Run the script
main