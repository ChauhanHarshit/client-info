#!/bin/bash

# GitHub Repository Setup Script
# This script prepares the repository for GitHub integration

echo "Setting up GitHub integration for Creator App..."

# Set Git configuration
git config --global user.name "Creator App Deploy"
git config --global user.email "deploy@tastyyyy.com"

# Initialize git if not already done
if [ ! -d ".git" ]; then
    git init
fi

# Add remote origin
git remote remove origin 2>/dev/null || true
git remote add origin https://github.com/tastyyyycrm/creator-app.git

# Stage all files
git add .

# Create initial commit
git commit -m "Initial commit: Creator App with full production infrastructure

Features:
- Complete CRM dashboard with role-based access control
- Creator portal with mobile-first TikTok-style interface
- Video streaming with Transloadit HLS encoding
- ImageKit CDN integration for optimized assets
- PlanetScale MySQL database with connection pooling
- Upstash Redis for session management
- Comprehensive content management system
- Employee management with department structure
- Client onboarding and workflow automation

Production Infrastructure:
- Database: PlanetScale MySQL with optimized connection pool
- CDN: ImageKit with automatic format optimization
- Video: Transloadit pipeline for HLS encoding and AWS S3 storage
- Cache: Upstash Redis for session and data caching
- DNS: Cloudflare with SSL and caching rules
- Deployment: Staging and production environments configured"

# Push to GitHub
echo "Repository prepared for GitHub push"
echo "To complete the setup, run: git push -u origin main"
echo ""
echo "GitHub Repository: https://github.com/tastyyyycrm/creator-app"
echo "Branch: main"
echo ""
echo "Next steps:"
echo "1. Run 'git push -u origin main' to push to GitHub"
echo "2. Configure GitHub Actions for automated deployment"
echo "3. Set up environment variables in GitHub repository settings"