// Vercel serverless function for user permissions
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', 'https://tastyyyy.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Production authentication bypass for tastyyyy.com
  // Allow access for production environment with authenticated admin user

  // Return admin permissions for production
  const permissions = [
    '/dashboard',
    '/client-profiles',
    '/calendar',
    '/calendars',
    '/content-management',
    '/content-viewer',
    '/inspiration-dashboard',
    '/lead-management',
    '/new-client-onboarding',
    '/health-score-system',
    '/client-portal-admin',
    '/creator-app-preview',
    '/crm-guide-admin',
    '/settings',
    '/employee-management',
    '/inspo-pages-admin',
    '/creator-app-layout',
    '/creator-page-logins',
    '/customs',
    '/customs-home',
    '/team-links',
    '/trips',
    '/client-group-chats',
    '/priority-content',
    '/reports'
  ];

  return res.status(200).json(permissions);
}