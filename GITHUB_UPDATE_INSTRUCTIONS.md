# GitHub Update Instructions for Vercel Routing Fix

## File to Update: vercel.json

Replace the current vercel.json content with:

```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "functions": {
    "server/index.ts": {
      "runtime": "nodejs18.x"
    }
  },
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/server/index.ts"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ]
}
```

## Key Change
Line 17: Changed `/dist/index.html` to `/index.html`

## Steps
1. Edit vercel.json in your GitHub repo (tastyyyycrm/creator-app)
2. Update line 17 with the corrected routing
3. Commit the change
4. Redeploy from Vercel dashboard

## Expected Result
After redeployment, tastyyycrm.vercel.app will load the complete CRM dashboard instead of showing 404.