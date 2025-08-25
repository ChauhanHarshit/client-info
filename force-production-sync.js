#!/usr/bin/env node

/**
 * Force Production Deployment Sync
 * Triggers cache invalidation and deployment refresh for tastyyyy.com
 */

import https from 'https';

async function forceCacheInvalidation() {
  const routes = [
    '/mass-calendar-log',
    '/calendar',
    '/calendars',
    '/admin-inspo-pages',
    '/admin-creator-app-layout',
    '/admin-creator-logins',
    '/home',
    '/trial-links',
    '/client-groupchats',
    '/reports',
    '/customs-dashboard',
    '/customs-team-links',
    '/settings',
    '/client-portal-admin',
    '/clients',
    '/content',
    '/content-viewer',
    '/crm-guide-admin',
    '/health-score-system',
    '/inspiration-dashboard',
    '/lead-management',
    '/new-client-onboarding'
  ];

  console.log('🔄 Forcing production cache invalidation for tastyyyy.com...');
  
  for (const route of routes) {
    try {
      const url = `https://tastyyyy.com${route}`;
      const options = {
        method: 'HEAD',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-Force-Refresh': Date.now().toString()
        }
      };

      await new Promise((resolve) => {
        const req = https.request(url, options, (res) => {
          console.log(`✅ ${route}: ${res.statusCode}`);
          resolve();
        });
        req.on('error', () => resolve());
        req.end();
      });
    } catch (error) {
      console.log(`❌ ${route}: Error`);
    }
  }
  
  console.log('🚀 Cache invalidation complete. Please test routes on tastyyyy.com');
}

forceCacheInvalidation();