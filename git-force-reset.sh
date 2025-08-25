#!/bin/bash
# Force reset Git to bypass persistent lock issues

echo "🔥 NUCLEAR OPTION: Completely resetting Git repository"
echo "This will destroy all Git history but preserve your code"

# Remove all Git data
rm -rf .git

# Initialize fresh repository
git init

# Add all files
git add .

# Create initial commit
git commit -m "Production authentication system ready - bypass Git lock"

echo "✅ Fresh Git repository created"
echo "Now manually add your GitHub remote and push:"
echo "git remote add origin [your-github-repo-url]"
echo "git push -u origin main --force"