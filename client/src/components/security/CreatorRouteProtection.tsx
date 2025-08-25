import { useEffect } from 'react';
import { useCreatorAuth } from '@/contexts/CreatorAuthContext';
import { useLocation } from 'wouter';

// List of CRM-only routes that creators must never access
const CRM_PROTECTED_ROUTES = [
  '/',
  '/dashboard',
  '/client-profiles',
  '/creators',
  '/employee-management',
  '/calendar',
  '/calendars',
  '/content-management',
  '/content-viewer',
  '/inspiration-dashboard',
  '/lead-management',
  '/new-client-onboarding',
  '/health-score-system',
  '/client-portal-admin',
  '/crm-guide-admin',
  '/settings',
  '/inspo-pages-admin',
  '/customs',
  '/customs-dashboard',
  '/customs-home',
  '/team-links',
  '/trips',
  '/content-trips',
  '/client-group-chats',
  '/priority-content',
  '/reports'
];

interface CreatorRouteProtectionProps {
  children: React.ReactNode;
}

export function CreatorRouteProtection({ children }: CreatorRouteProtectionProps) {
  const { isCreatorAuthenticated } = useCreatorAuth();
  const [location] = useLocation();

  useEffect(() => {
    // Only run protection if creator is authenticated
    if (!isCreatorAuthenticated) return;

    // Check if current route is a protected CRM route
    const isProtectedRoute = CRM_PROTECTED_ROUTES.some(route => 
      location === route || location.startsWith(route + '/')
    );

    if (isProtectedRoute) {
      console.warn('SECURITY BREACH PREVENTED: Creator attempted to access CRM route:', location);
      
      // Immediately redirect to creator app
      window.location.replace('/creator-app-layout');
    }
  }, [location, isCreatorAuthenticated]);

  return <>{children}</>;
}