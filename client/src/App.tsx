import { Switch, Route, useLocation, Router } from "wouter";
import { useCrmAuth, CrmAuthProvider } from "@/contexts/CrmAuthContext";
import { useCreatorAuth, CreatorAuthProvider } from "@/contexts/CreatorAuthContext";
import { DashboardLayout } from "@/components/dashboard-layout";
import { CenteredPageLoader } from "@/components/ui/loading-animation";
import { CreatorRouteProtection } from "@/components/security/CreatorRouteProtection";
import RouteErrorBoundary from "@/components/RouteErrorBoundary";
import { useEffect } from "react";

// Force production cache refresh - v2.1 - Complete route sync

// Essential pages
import Dashboard from "@/pages/dashboard";
import Home from "@/pages/home";
import EmployeeLogin from "@/pages/employee-login";
import CreatorLogin from "@/pages/creator-login";
import NotFound from "@/pages/not-found";
import ClientProfiles from "@/pages/client-profiles";
import CalendarPage from "@/pages/calendar";
import ContentManagement from "@/pages/content-management";
import EmployeeManagement from "@/pages/employee-management";
import ContentInspirationDashboard from "@/pages/content-inspiration-dashboard";
import ContentTripsDashboard from "@/pages/content-trips-dashboard";
import WhaleMaintenance from "@/pages/whale-maintenance";
import CustomsDashboard from "@/pages/customs-dashboard";
import PriorityContent from "@/pages/priority-content";
import InspoPages from "@/pages/inspo-pages-admin";
import WeeklyReportsAdmin from "@/pages/weekly-reports-admin";
import InvoiceManagementAdmin from "@/pages/invoice-management-admin";
import ContentInventoryDashboard from "@/pages/content-inventory-dashboard";
import LeadManagement from "@/pages/lead-management";
import NewClientOnboarding from "@/pages/new-client-onboarding";
import GuaranteeTracking from "@/pages/guarantee-tracking";
import HealthScoreSystem from "@/pages/health-score-system";
import GrowthMetricsAdmin from "@/pages/growth-metrics-admin";
import CrmGuideAdmin from "@/pages/crm-guide-admin";
import MediaManagementAdmin from "@/pages/media-management-admin";
import BannerInventoryAdmin from "@/pages/banner-inventory-admin";
import ContentOutputAdmin from "@/pages/content-output-admin";
import MassCalendarLog from "@/pages/mass-calendar-log";
import TeamDashboard from "@/pages/team-dashboard";
import CustomsTeamLinks from "@/pages/customs-team-links";
import CreatorPageLogins from "@/pages/creator-page-logins";
import CreatorAppLayoutExact from "@/pages/creator-app-layout-exact";
import { CreatorAppPreview } from "@/components/CreatorAppPreview";
import ClientPortalAdmin from "@/pages/client-portal-admin";
import Settings from "@/pages/settings";
import CreatorSetup from "@/pages/creator-setup";
import NotionPageEditor from "@/pages/notion-page-editor";
import MinimalTeamForm from "@/pages/minimal-team-form";
import TeamDashboardView from "@/pages/team-dashboard-view";
import FeedPageViewer from "@/pages/feed-page-viewer";
import TripInvite from "@/pages/trip-invite";
import AestheticBuilderAdmin from "@/pages/aesthetic-builder-admin";
import AestheticAssignment from "@/pages/aesthetic-assignment";
import InvitationAccept from "@/pages/invitation-accept";
import CreatorReviewPublic from "@/pages/creator-review-public";
import SharedPriorityContent from "@/pages/priority-content-shared";
import Help from "@/pages/help";
import HelpAdmin from "@/pages/help-admin";
import SecurityAdmin from "@/pages/security-admin";
import ClientComms from "@/pages/client-comms";
import ClientOnboarding from "@/pages/client-onboarding";
import Notifications from "@/pages/notifications";
import ClientForm from "@/pages/client-form";
import ClientBasicInfo from "@/pages/client-basic-info";
import ClientPasswords from "@/pages/client-passwords";
import PublicClientIntake from "@/pages/public-client-intake";
import RoadmapsInternal from "@/pages/roadmaps-internal";
import RoadmapsClient from "@/pages/roadmaps-client";
import HRDashboard from "@/pages/hr-dashboard";
import HRSOPs from "@/pages/hr-sops";
import HRKPIs from "@/pages/hr-kpis";
import HubDocsSheets from "@/pages/hub-docs-sheets";
import HubProjectManagement from "@/pages/hub-project-management";


function AppRouter() {
  const [location] = useLocation();

  // Debug logging for production troubleshooting


  // ALL HOOKS MUST BE CALLED FIRST - React Rules of Hooks compliance
  const { isAuthenticated: isEmployeeAuthenticated, isLoading: isEmployeeLoading } = useCrmAuth();
  const { isCreatorAuthenticated, isLoading: isCreatorLoading } = useCreatorAuth();



  // Note: Public routes are handled by PublicRouteHandler before this component loads

  // Show loading spinner while authentication is being checked
  if (isEmployeeLoading || isCreatorLoading) {
    return <CenteredPageLoader />;
  }

  // CRITICAL SECURITY: Check for creator authentication first to prevent CRM access
  if (isCreatorAuthenticated) {
    // Creators can ONLY access their dedicated creator app - NO CRM access
    return (
      <Switch>
        <Route path="/creator-app-layout">
          {() => <CreatorAppLayoutExact />}
        </Route>
        <Route path="/creator-setup" component={CreatorSetup} />
        <Route>
          {() => {
            // Force redirect any creator trying to access CRM routes
            window.location.href = '/creator-app-layout';
            return null;
          }}
        </Route>
      </Switch>
    );
  }

  // Show login page for unauthenticated users
  if (!isEmployeeAuthenticated && !isCreatorAuthenticated) {

    return (
      <Switch>
        <Route path="/invitation" component={InvitationAccept} />
        <Route path="/login" component={EmployeeLogin} />
        <Route path="/creatorlogin">
          {() => {
            return <CreatorLogin />;
          }}
        </Route>

        {/* Public shared priority content route */}
        <Route path="/priority-content-public/:id">
          {(params) => <SharedPriorityContent />}
        </Route>

        {/* Public help page - no authentication required */}
        <Route path="/help" component={Help} />


        {/* Redirect creator-app-layout access to creator login */}
        <Route path="/creator-app-layout">
          {() => {
            window.location.href = '/creatorlogin';
            return null;
          }}
        </Route>

        {/* Default redirect to login for unauthenticated users */}
        <Route path="/">
          {() => {
            window.location.href = '/login';
            return null;
          }}
        </Route>

        <Route component={NotFound} />
      </Switch>
    );
  }

  // Employee is authenticated - show full CRM dashboard with admin access
  // Direct route handlers for problematic routes
  if (location === '/mass-calendar-log') {
    return (
      <DashboardLayout>
        <MassCalendarLog />
      </DashboardLayout>
    );
  }

  if (location === '/inspo-pages-admin') {
    return (
      <DashboardLayout>
        <InspoPages />
      </DashboardLayout>
    );
  }

  if (location === '/creator-app-layout') {
    // If employee is authenticated, show CRM embedded preview
    if (isEmployeeAuthenticated && !isCreatorAuthenticated) {
      return (
        <DashboardLayout>
          <CreatorAppPreview />
        </DashboardLayout>
      );
    }
    // If creator is authenticated, show creator app directly
    return (
      <CreatorRouteProtection>
        <CreatorAppLayoutExact />
      </CreatorRouteProtection>
    );
  }

  if (location === '/creator-page-logins') {
    return (
      <DashboardLayout>
        <CreatorPageLogins />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/clients" component={ClientProfiles} />
        <Route path="/client-comms" component={ClientComms} />
        <Route path="/calendar" component={CalendarPage} />
        <Route path="/calendars" component={CalendarPage} />
        <Route path="/content" component={ContentManagement} />
        <Route path="/mass-calendar-log" component={MassCalendarLog} />
        <Route path="/content-trips" component={ContentTripsDashboard} />
        <Route path="/inspiration-dashboard" component={ContentInspirationDashboard} />
        <Route path="/employee-management" component={EmployeeManagement} />

        {/* Content & Communications */}
        <Route path="/inspo-pages" component={InspoPages} />
        <Route path="/inspo-pages-admin" component={InspoPages} />
        <Route path="/admin-inspo-pages" component={InspoPages} />
        <Route path="/notion-page-editor/:id">
          {(params) => <NotionPageEditor pageId={params.id} />}
        </Route>
        <Route path="/feed-page-viewer/:id">
          {(params) => <FeedPageViewer pageId={params.id} />}
        </Route>
        <Route path="/creator/demo">
          {() => {
            const urlParams = new URLSearchParams(window.location.search);
            const pageId = urlParams.get('page');
            if (!pageId) return <div>Page ID required</div>;
            return <NotionPageEditor pageId={pageId as string} />
          }}
        </Route>
        <Route path="/customs" component={CustomsDashboard} />
        <Route path="/customs-dashboard" component={CustomsDashboard} />
        <Route path="/customs-team-links" component={CustomsTeamLinks} />
        <Route path="/whale-maintenance" component={WhaleMaintenance} />
        <Route path="/priority-content" component={PriorityContent} />
        <Route path="/client-comms" component={ClientComms} />
        <Route path="/client-onboarding" component={ClientOnboarding} />
        <Route path="/notifications" component={Notifications} />
        
        {/* Client Information System */}
        <Route path="/client-form" component={ClientForm} />
        <Route path="/client-basic-info" component={ClientBasicInfo} />
        <Route path="/client-passwords" component={ClientPasswords} />
        <Route path="/roadmaps/internal" component={RoadmapsInternal} />
        <Route path="/roadmaps/client" component={RoadmapsClient} />
        
        {/* HR Pages */}
        <Route path="/hr-dashboard" component={HRDashboard} />
        <Route path="/hr-sops" component={HRSOPs} />
        <Route path="/hr-kpis" component={HRKPIs} />
        
        {/* Hub Pages */}
        <Route path="/hub/docs-sheets" component={HubDocsSheets} />
        <Route path="/hub/project-management" component={HubProjectManagement} />
        
        <Route path="/weekly-reports" component={WeeklyReportsAdmin} />
        <Route path="/reports" component={WeeklyReportsAdmin} />
        <Route path="/client-group-chats" component={ClientPortalAdmin} />
        <Route path="/team-links" component={CustomsTeamLinks} />
        <Route path="/trial-links" component={TeamDashboard} />

        {/* Admin Tools */}
        <Route path="/content-inventory" component={ContentInventoryDashboard} />
        <Route path="/invoice-management" component={InvoiceManagementAdmin} />
        <Route path="/lead-management" component={LeadManagement} />
        <Route path="/new-client-onboarding" component={NewClientOnboarding} />
        <Route path="/guarantee-tracking" component={GuaranteeTracking} />
        <Route path="/health-score-system" component={HealthScoreSystem} />
        <Route path="/growth-metrics" component={GrowthMetricsAdmin} />
        <Route path="/crm-guide" component={CrmGuideAdmin} />
        <Route path="/help-admin" component={HelpAdmin} />
        <Route path="/security-admin" component={SecurityAdmin} />
        <Route path="/media-management" component={MediaManagementAdmin} />
        <Route path="/banner-inventory" component={BannerInventoryAdmin} />
        <Route path="/content-output" component={ContentOutputAdmin} />

        <Route path="/team-dashboard" component={TeamDashboard} />
        <Route path="/creator-page-logins" component={CreatorPageLogins} />
        <Route path="/settings" component={Settings} />
        <Route path="/crm-guide-admin" component={CrmGuideAdmin} />
        <Route path="/help-admin" component={HelpAdmin} />
        <Route path="/client-portal-admin" component={ClientPortalAdmin} />
        <Route path="/content-viewer" component={ContentManagement} />
        <Route path="/crm-guide-admin" component={CrmGuideAdmin} />
        <Route path="/lead-management" component={LeadManagement} />
        <Route path="/new-client-onboarding" component={NewClientOnboarding} />
        <Route path="/aesthetic-builder-admin" component={AestheticBuilderAdmin} />
        <Route path="/aesthetic-assignment" component={AestheticAssignment} />

        {/* Allow access to creator login for testing even when logged in as employee */}
        <Route path="/creatorlogin" component={CreatorLogin} />


        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

function App() {
  // IMMEDIATE URL CHECK - before any router loading
  const currentPath = window.location.pathname;


  // Direct team form check with no router interference
  if (currentPath.startsWith('/team-form/')) {
    return (
      <RouteErrorBoundary>
        <TeamDashboardView />
      </RouteErrorBoundary>
    );
  }

  // Direct client intake check with no router interference
  if (currentPath.startsWith('/client-intake/')) {
    return (
      <RouteErrorBoundary>
        <PublicClientIntake />
      </RouteErrorBoundary>
    );
  }

  return (
    <RouteErrorBoundary>
      <Router>
        <PublicRouteHandler />
      </Router>
    </RouteErrorBoundary>
  );
}

function PublicRouteHandler() {
  const [location] = useLocation();


  // Handle team form routes - completely public, no authentication needed
  if (location.startsWith('/team-form/')) {
    return <TeamDashboardView />;
  }

  // Handle client intake routes - completely public, no authentication needed
  if (location.startsWith('/client-intake/')) {
    return <PublicClientIntake />;
  }

  // Handle public review routes - completely public, no authentication needed
  if (location.startsWith('/review/')) {
    const token = location.split('/')[2]; // Extract token from /review/{token}
    console.log('PublicRouteHandler - Rendering CreatorReviewPublic with token:', token);
    return <CreatorReviewPublic token={token} />;
  }

  // Handle other public routes
  if (location === '/creator-setup') {
    console.log('PublicRouteHandler - Rendering CreatorSetup');
    return <CreatorSetup />;
  }

  if (location.startsWith('/trip-invite/')) {
    console.log('PublicRouteHandler - Rendering TripInvite');
    return (
      <CreatorAuthProvider>
        <TripInvite />
      </CreatorAuthProvider>
    );
  }

  // Handle shared priority content routes - completely public, no authentication needed
  if (location.startsWith('/priority-content-public/')) {
    console.log('PublicRouteHandler - Rendering SharedPriorityContent');
    return <SharedPriorityContent />;
  }

  // Handle help page - completely public, no authentication needed
  if (location === '/help') {
    console.log('PublicRouteHandler - Rendering Help');
    return <Help />;
  }

  // Handle login routes explicitly
  if (location === '/login') {
    console.log('PublicRouteHandler - Rendering EmployeeLogin');
    return (
      <CrmAuthProvider>
        <EmployeeLogin />
      </CrmAuthProvider>
    );
  }

  if (location === '/creatorlogin') {
    console.log('PublicRouteHandler - Rendering CreatorLogin');
    return (
      <CreatorAuthProvider>
        <CreatorLogin />
      </CreatorAuthProvider>
    );
  }

  // Handle authenticated routes (including root route) - pass to AuthenticatedApp
  const publicOnlyRoutes = [
    '/login', '/creatorlogin', '/creator-setup', '/help'
  ];

  const publicPrefixRoutes = [
    '/team-form/', '/review/', '/trip-invite/', '/priority-content-public/', '/client-intake/'
  ];

  const isPublicOnlyRoute = publicOnlyRoutes.includes(location);
  const isPublicPrefixRoute = publicPrefixRoutes.some(route => location.startsWith(route));

  // If it's not a public-only route, pass to AuthenticatedApp for proper routing
  if (!isPublicOnlyRoute && !isPublicPrefixRoute) {
    console.log('PublicRouteHandler - Passing to AuthenticatedApp:', location);
    return <AuthenticatedApp />;
  }

  // Unknown public route - show 404
  console.log('PublicRouteHandler - Unknown public route, showing 404:', location);
  return <NotFound />;
}

function AuthenticatedApp() {
  return (
    <CrmAuthProvider>
      <CreatorAuthProvider>
        <CreatorRouteProtection>
          <div></div>
        </CreatorRouteProtection>
        <AppRouter />
      </CreatorAuthProvider>
    </CrmAuthProvider>
  );
}

export default App;