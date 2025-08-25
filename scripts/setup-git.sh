#!/bin/bash
# Git Integration Setup Script for GitHub
# This script configures Git repository and prepares for GitHub deployment

echo "🔧 Setting up Git integration for Creator App..."

# Initialize Git repository if not already done
if [ ! -d ".git" ]; then
    git init
    echo "✅ Git repository initialized"
else
    echo "✅ Git repository already exists"
fi

# Create .gitignore if it doesn't exist
if [ ! -f ".gitignore" ]; then
    cat > .gitignore << 'EOF'
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Production builds
dist/
build/

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Database
*.db
*.sqlite

# Logs
logs/
*.log

# Runtime data
pids/
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/

# Temporary folders
tmp/
temp/

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Uploads and media
uploads/
*.mp4
*.mov
*.avi

# Cache
.cache/
.parcel-cache/

# Replit specific
.replit
.upm/
replit.nix
EOF
    echo "✅ .gitignore created"
else
    echo "✅ .gitignore already exists"
fi

# Create GitHub workflow for CI/CD
mkdir -p .github/workflows

cat > .github/workflows/deploy.yml << 'EOF'
name: Deploy to Production

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '20'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm test --if-present
    
    - name: Build application
      run: npm run build --if-present

  deploy-staging:
    if: github.ref == 'refs/heads/main'
    needs: test
    runs-on: ubuntu-latest
    environment: staging
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Deploy to Staging
      run: |
        echo "Deploying to staging environment..."
        # Add staging deployment commands here
    
  deploy-production:
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    needs: [test, deploy-staging]
    runs-on: ubuntu-latest
    environment: production
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Deploy to Production
      run: |
        echo "Deploying to production environment..."
        # Add production deployment commands here
EOF

echo "✅ GitHub Actions workflow created"

echo ""
echo "🎉 Git setup complete!"
echo ""
echo "Next steps:"
echo "1. Create a new repository on GitHub"
echo "2. Run: git remote add origin https://github.com/yourusername/creator-app.git"
echo "3. Run: git push -u origin main"
echo "4. Configure GitHub secrets for deployment"
echo ""
echo "Required GitHub Secrets:"
echo "- DATABASE_URL"
echo "- UPSTASH_REDIS_REST_URL"
echo "- UPSTASH_REDIS_REST_TOKEN"
echo "- TRANSLOADIT_AUTH_SECRET"
echo "- IMAGEKIT_PRIVATE_KEY"
echo "- SESSION_SECRET"