#!/bin/bash
# Staging Deployment Script
# Deploys the Creator App to staging environment for safe production testing

echo "🚀 Deploying Creator App to Staging Environment..."

# Set staging environment
export NODE_ENV=staging

# Load staging environment variables
if [ -f ".env.staging" ]; then
    source .env.staging
    echo "✅ Staging environment variables loaded"
else
    echo "❌ .env.staging file not found"
    exit 1
fi

# Validate required environment variables
required_vars=("DATABASE_URL" "UPSTASH_REDIS_REST_URL" "UPSTASH_REDIS_REST_TOKEN" "SESSION_SECRET")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Required environment variable $var is not set"
        exit 1
    fi
done

echo "✅ Environment variables validated"

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --production=false

# Build the application
echo "🔨 Building application..."
npm run build

# Run database migrations
echo "🗄️ Running database migrations..."
npm run db:push

# Test database connection
echo "🔍 Testing database connection..."
node -e "
const { db } = require('./server/db.ts');
db.select().from('users').limit(1).then(() => {
    console.log('✅ Database connection successful');
    process.exit(0);
}).catch(err => {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
});
"

# Test video pipeline
echo "🎥 Testing video upload pipeline..."
curl -s "http://localhost:5000/api/video/test-pipeline" | jq '.'

echo ""
echo "🎉 Staging deployment complete!"
echo ""
echo "Staging Environment URLs:"
echo "- App: https://staging.tastyyyy.com"
echo "- API: https://staging.tastyyyy.com/api"
echo ""
echo "Test checklist:"
echo "□ Employee login functionality"
echo "□ Creator login functionality"
echo "□ Video upload and processing"
echo "□ HLS video playback"
echo "□ Content management features"
echo "□ Creator App mobile interface"
echo ""