import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useCrmAuth } from "@/contexts/CrmAuthContext";
import { Link, useLocation } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  BarChart3, 
  Users, 
  FileText, 
  Settings, 
  Check,
  LogOut,
  Plus,
  Play,
  ChevronDown,
  MessageSquare,
  ChevronRight,
  Folder,
  Lightbulb,
  Menu,
  Home,
  Calendar,
  Globe,
  DollarSign,
  Anchor,
  Star,
  Hand,
  Smartphone,
  Key,
  Palette,
  FolderOpen,
  Building2,
  Heart,
  Eye,
  TrendingUp,
  Wrench,
  Briefcase,
  Layout,
  Sparkles,
  Shield,
  Bell,
  MapPin,
  CheckSquare,
  FolderTree,
  KanbanSquare
} from "lucide-react";
import type { Team, User } from "@shared/schema";

interface SidebarProps {
  activeTeam?: number;
}

export function Sidebar({ activeTeam }: SidebarProps) {
  const { user } = useAuth();
  const { employee, hasPageAccess, hasDepartmentAccess, isAuthenticated, logout } = useCrmAuth();
  const [location] = useLocation();
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // State for collapsible sections
  const [managementOpen, setManagementOpen] = useState(true);
  const [contentCommunicationsOpen, setContentCommunicationsOpen] = useState(true);
  const [inspoPagesOpen, setInspoPagesOpen] = useState(false);
  const [customsOpen, setCustomsOpen] = useState(false);
  const [workingOnOpen, setWorkingOnOpen] = useState(true);
  const [operationsOpen, setOperationsOpen] = useState(true);
  const [businessOpen, setBusinessOpen] = useState(true);
  const [teamManagementOpen, setTeamManagementOpen] = useState(false);
  const [clientInfoOpen, setClientInfoOpen] = useState(false);
  const [roadmapsOpen, setRoadmapsOpen] = useState(false);
  const [hrOpen, setHROpen] = useState(false);
  const [hubOpen, setHubOpen] = useState(false);

  // Fetch teams and departments
  const { data: teams = [] } = useQuery({
    queryKey: ["/api/teams"],
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  const { data: departments = {} } = useQuery({
    queryKey: ["/api/departments"],
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  // Helper functions
  const isActive = (path: string) => location === path;
  const isTeamActive = (teamId: number) => location === `/team/${teamId}`;

  const getTeamCreatorCount = (teamId: number) => {
    const team = (teams as Team[]).find((t: Team) => t.id === teamId);
    return team?.creatorCount || 0;
  };

  // Fetch user permissions
  const { data: permissionsData } = useQuery({
    queryKey: ["/api/auth/permissions"],
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch user's team permissions with custom query function
  const { data: teamPermissions = { pageIds: [], massAccess: false }, isLoading: teamPermissionsLoading, error: teamPermissionsError } = useQuery({
    queryKey: ["/api/auth/team-permissions"],
    enabled: isAuthenticated && !!employee,
    staleTime: 0, // Disable caching for debugging
    gcTime: 0, // Disable garbage collection time for debugging
    queryFn: async () => {
      console.log('🔥 CUSTOM TEAM PERMISSIONS QUERY STARTING');
      const apiUrl = `${window.location.protocol}//${window.location.host}/api/auth/team-permissions`;
      console.log('🔥 Making direct request to:', apiUrl);

      try {
        const response = await fetch(apiUrl, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        console.log('🔥 Team permissions response status:', response.status);

        if (!response.ok) {
          console.error('🔥 Team permissions request failed:', response.status, response.statusText);
          const errorText = await response.text();
          console.error('🔥 Error response:', errorText);
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        console.log('🔥 Team permissions data received:', data);
        return data;
      } catch (error) {
        console.error('🔥 Team permissions fetch error:', error);
        throw error;
      }
    },
  });

  // Debug team permissions
  console.log('Team permissions debug:', {
    isAuthenticated,
    employee,
    teamPermissions,
    teamPermissionsLoading,
    teamPermissionsError,
    queryEnabled: isAuthenticated && !!employee,
    hasTeamAccessCustoms: teamPermissions.pageIds?.includes('customs-dashboard'),
    hasTeamAccessTrips: teamPermissions.pageIds?.includes('trips'),
  });

  // Team-based page access control (moved after teamPermissions is defined)
  const hasTeamAccess = (pageId: string) => {
    // Admin users with mass access can see everything
    if (employee?.massAccess || teamPermissions.massAccess) {
      return true;
    }

    // Check if user's team has access to this page
    return teamPermissions.pageIds?.includes(pageId) || false;
  };

  // Page ID mapping based on the database schema
  const pageIdMap = {
    "/": 1, // Main Dashboard
    "/employee-management": 2, // Employee Management
    "/lead-management": 3, // Lead Management
    "/creator-app-preview": 4, // Creator App Preview
    "/content-inspiration": 5, // Content Inspiration
    "/notion-inspiration/2": 6, // Notion-Style Editor
    "/calendar": 7, // Calendar Management
    "/calendars": 7, // Calendar Management (alias)
    "/customs": 8, // Customs
    "/trips": 9, // Trips
    "/client-group-chats": 10, // Client Group Chats
    "/reports": 11, // Reports
    "/inspo-pages-admin": 12, // Inspo Pages Admin
    "/creator-app-layout": 13, // Creator App Layout
    "/creator-page-logins": 14, // Creator Page Logins
    "/priority-content": 15, // Priority Content
    "/new-client-onboarding": 16, // New Client Onboarding
    "/clients": 17, // Client Profiles
    "/content": 18, // Content Management
    "/inspiration-dashboard": 19, // Content Inspiration Dashboard
  };

  // Function to check if user has access to a specific page
  const hasPagePermission = (href: string): boolean => {
    if (!employee) return false;

    // Mass access override - this admin has full access
    if (employee.massAccess) return true;

    // Admin access level has all permissions
    if (employee.accessLevel === 'admin') return true;

    // Check if user is active (if property exists)
    if (employee.hasOwnProperty('isActive') && !employee.isActive) return false;

    const pageId = pageIdMap[href as keyof typeof pageIdMap];
    if (!pageId) return false;

    // Check if user has access to this specific page
    const userPages = permissionsData?.pages || [];
    return userPages.some((page: any) => page.id === pageId);
  };

  // Function to check if user has access to any admin tools
  const hasAnyAdminToolAccess = (): boolean => {
    // For mass access users, always show admin tools
    if (employee?.massAccess) {
      console.log("hasAnyAdminToolAccess: true (mass access)");
      return true;
    }

    // For admin access level users, always show admin tools
    if (employee?.accessLevel === 'admin') {
      console.log("hasAnyAdminToolAccess: true (admin access level)");
      return true;
    }

    const adminToolPages = [
      "/employee-management",
      "/clients",
      "/calendar", 
      "/content",
      "/inspiration-dashboard",
      "/lead-management", 
      "/creator-app-preview",
      "/new-client-onboarding",
      "/health-score-system",
      "/settings",
      "/crm-guide-admin",
      "/content-viewer"
    ];
    const hasAccess = adminToolPages.some(page => hasPagePermission(page));
    console.log("hasAnyAdminToolAccess: checking pages", { hasAccess, employee });
    return hasAccess;
  };

  // Function to check if user has access to any working on section items
  const hasAnyWorkingOnAccess = (): boolean => {
    // Check if user has access to any departments in the working on section
    const userDepartments = permissionsData?.departments || [];
    return userDepartments.length > 0;
  };

  const userInitials = employee ? `${employee.firstName?.[0] || ''}${employee.lastName?.[0] || ''}` : 'U';
  const userRole = employee?.role || 'employee';

  // If not authenticated, show minimal sidebar
  if (!isAuthenticated) {
    return (
      <aside className="fixed left-0 top-0 h-full w-16 bg-background dark:bg-background border-r border-border dark:border-border z-40 flex flex-col">
        <div className="p-4">
          <div className="w-8 h-8 bg-muted dark:bg-muted rounded-lg"></div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="h-screen w-64 bg-background dark:bg-background border-r border-border dark:border-border flex flex-col flex-shrink-0">
      {/* Header Section - Fixed */}
      <div className="flex-shrink-0 border-b border-border dark:border-border">
        <div className="p-4">
          <div className="text-xl font-bold text-foreground dark:text-foreground">Tasty</div>
        </div>
      </div>

      {/* Navigation Content - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        <nav className="p-4 space-y-1">
          {/* Welcome - only show if user has permission or mass access */}
          {(hasTeamAccess("dashboard") || employee?.massAccess || employee?.accessLevel === 'admin') && (
            <Link href="/">
              <span className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive("/") 
                  ? "bg-primary/10 text-primary" 
                  : "text-foreground dark:text-foreground hover:bg-muted dark:hover:bg-muted"
              }`}>
                <Home className="w-5 h-5 mr-3" />
                Welcome
              </span>
            </Link>
          )}



          {/* Content & Communications Section */}
          <div className="pt-4">
            <Collapsible open={contentCommunicationsOpen} onOpenChange={setContentCommunicationsOpen}>
              <CollapsibleTrigger className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider hover:bg-slate-50 rounded-lg">
                <div className="flex items-center">
                  <span>Content & Comms</span>
                </div>
                <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${contentCommunicationsOpen ? 'rotate-90' : ''}`} />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-1 mt-1">
                {/* Inspo Pages Dropdown - LOCKED & FINALIZED */}
                <Collapsible open={inspoPagesOpen} onOpenChange={setInspoPagesOpen}>
                  <CollapsibleTrigger className="w-full flex items-center justify-between px-3 py-2 ml-4 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg">
                    <div className="flex items-center">
                      <Lightbulb className="w-4 h-4 mr-2" />
                      <span>Inspo Pages</span>
                    </div>
                    <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${inspoPagesOpen ? 'rotate-90' : ''}`} />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pl-6 space-y-1">
                    <Link href="/inspo-pages-admin">
                      <span className={`flex items-center px-3 py-2 rounded-lg text-sm cursor-pointer ${
                        isActive("/inspo-pages-admin")
                          ? "bg-primary/10 text-primary"
                          : "text-slate-700 hover:bg-slate-100"
                      }`}>
                        Inspo Pages Admin
                      </span>
                    </Link>
                    <Link href="/creator-app-layout">
                      <span className={`flex items-center px-3 py-2 rounded-lg text-sm cursor-pointer ${
                        isActive("/creator-app-layout")
                          ? "bg-primary/10 text-primary"
                          : "text-slate-700 hover:bg-slate-100"
                      }`}>
                        Creator App Layout
                      </span>
                    </Link>
                    <Link href="/creator-page-logins">
                      <span className={`flex items-center px-3 py-2 rounded-lg text-sm cursor-pointer ${
                        isActive("/creator-page-logins")
                          ? "bg-primary/10 text-primary"
                          : "text-slate-700 hover:bg-slate-100"
                      }`}>
                        Creator Page Logins
                      </span>
                    </Link>
                  </CollapsibleContent>
                </Collapsible>

                {/* Customs Dropdown */}
                {(hasTeamAccess("customs-dashboard") || hasTeamAccess("customs-team-links")) && (
                  <Collapsible open={customsOpen} onOpenChange={setCustomsOpen}>
                    <CollapsibleTrigger className="w-full flex items-center justify-between px-3 py-2 ml-4 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg">
                      <div className="flex items-center">
                        <Wrench className="w-5 h-5 mr-3" />
                        <span>Customs</span>
                      </div>
                      <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${customsOpen ? 'rotate-90' : ''}`} />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-1 mt-1">
                      <Link href="/customs-dashboard">
                        <span className={`flex items-center px-3 py-2 ml-8 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                          isActive("/customs-dashboard") 
                            ? "bg-primary/10 text-primary" 
                            : "text-slate-700 hover:bg-slate-100"
                        }`}>
                          Customs
                        </span>
                      </Link>
                      <Link href="/customs-team-links">
                        <span className={`flex items-center px-3 py-2 ml-8 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                          isActive("/customs-team-links") 
                            ? "bg-primary/10 text-primary" 
                            : "text-slate-700 hover:bg-slate-100"
                        }`}>
                          Team Links
                        </span>
                      </Link>
                    </CollapsibleContent>
                  </Collapsible>
                )}

                {/* Trips */}
                {(hasTeamAccess("trips") || hasTeamAccess("content-trips")) && (
                  <Link href="/content-trips">
                    <span 
                      className={`flex items-center px-3 py-2 ml-4 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                        isActive("/content-trips") 
                          ? "bg-primary/10 text-primary" 
                          : "text-slate-700 hover:bg-slate-100"
                      }`}
                      onMouseEnter={() => {
                        // Prefetch content trips data when hovering
                        queryClient.prefetchQuery({
                          queryKey: ['/api/content-trips/upcoming'],
                          queryFn: async () => {
                            const response = await apiRequest('GET', '/api/content-trips/upcoming');
                            return response.json();
                          },
                          staleTime: 1000 * 60, // Same as main query
                        });
                      }}
                    >
                      <Anchor className="w-5 h-5 mr-3" />
                      Trips
                    </span>
                  </Link>
                )}

                {/* Client Group Chats */}
                {hasTeamAccess("client-group-chats") && (
                  <Link href="/client-group-chats">
                    <span className={`flex items-center px-3 py-2 ml-4 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                      isActive("/client-group-chats") 
                        ? "bg-primary/10 text-primary" 
                        : "text-slate-700 hover:bg-slate-100"
                    }`}>
                      <MessageSquare className="w-5 h-5 mr-3" />
                      Client Group Chats
                    </span>
                  </Link>
                )}

                {/* Priority Content */}
                {hasTeamAccess("priority-content") && (
                  <Link href="/priority-content">
                    <span className={`flex items-center px-3 py-2 ml-4 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                      isActive("/priority-content") 
                        ? "bg-primary/10 text-primary" 
                        : "text-slate-700 hover:bg-slate-100"
                    }`}>
                      <Star className="w-5 h-5 mr-3" />
                      Priority Content
                    </span>
                  </Link>
                )}

                {/* Reports */}
                {hasTeamAccess("reports") && (
                  <Link href="/reports">
                    <span className={`flex items-center px-3 py-2 ml-4 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                      isActive("/reports") 
                        ? "bg-primary/10 text-primary" 
                        : "text-slate-700 hover:bg-slate-100"
                    }`}>
                      <FileText className="w-5 h-5 mr-3" />
                      Reports
                    </span>
                  </Link>
                )}

                {/* Calendar */}
                {hasTeamAccess("calendar") && (
                  <Link href="/calendar">
                    <span className={`flex items-center px-3 py-2 ml-4 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                      isActive("/calendar") || isActive("/calendars")
                        ? "bg-primary/10 text-primary" 
                        : "text-slate-700 hover:bg-slate-100"
                    }`}>
                      <Calendar className="w-5 h-5 mr-3" />
                      Calendar
                    </span>
                  </Link>
                )}
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* Working On Section */}
          <div className="pt-4">
            <Collapsible open={workingOnOpen} onOpenChange={setWorkingOnOpen}>
              <CollapsibleTrigger className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider hover:bg-slate-50 rounded-lg">
                <div className="flex items-center">
                  <span>Working On</span>
                </div>
                <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${workingOnOpen ? 'rotate-90' : ''}`} />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-1 mt-1">
                {/* Client Communications */}
                {hasPagePermission("/client-comms") && (
                  <Link href="/client-comms">
                    <span className={`flex items-center px-3 py-2 ml-4 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                      isActive("/client-comms") 
                        ? "bg-primary/10 text-primary" 
                        : "text-slate-700 hover:bg-slate-100"
                    }`}>
                      <MessageSquare className="w-5 h-5 mr-3" />
                      Client Comms
                    </span>
                  </Link>
                )}
                
                {/* Client Onboarding */}
                {hasPagePermission("/client-onboarding") && (
                  <Link href="/client-onboarding">
                    <span className={`flex items-center px-3 py-2 ml-4 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                      isActive("/client-onboarding") 
                        ? "bg-primary/10 text-primary" 
                        : "text-slate-700 hover:bg-slate-100"
                    }`}>
                      <Users className="w-5 h-5 mr-3" />
                      Client Onboarding
                    </span>
                  </Link>
                )}
                
                {/* Notifications */}
                {hasPagePermission("/notifications") && (
                  <Link href="/notifications">
                    <span className={`flex items-center px-3 py-2 ml-4 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                      isActive("/notifications") 
                        ? "bg-primary/10 text-primary" 
                        : "text-slate-700 hover:bg-slate-100"
                    }`}>
                      <Bell className="w-5 h-5 mr-3" />
                      Notifications
                    </span>
                  </Link>
                )}
                
                {/* Client Information Dropdown */}
                <Collapsible open={clientInfoOpen} onOpenChange={setClientInfoOpen}>
                  <CollapsibleTrigger className="w-full flex items-center justify-between px-3 py-2 ml-4 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg">
                    <div className="flex items-center">
                      <FileText className="w-5 h-5 mr-3" />
                      <span>Client Information</span>
                    </div>
                    <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${clientInfoOpen ? 'rotate-90' : ''}`} />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-1 mt-1">
                    <Link href="/client-form">
                      <span className={`flex items-center px-3 py-2 ml-8 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                        isActive("/client-form") 
                          ? "bg-primary/10 text-primary" 
                          : "text-slate-700 hover:bg-slate-100"
                      }`}>
                        Client Forms
                      </span>
                    </Link>
                    <Link href="/client-basic-info">
                      <span className={`flex items-center px-3 py-2 ml-8 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                        isActive("/client-basic-info") 
                          ? "bg-primary/10 text-primary" 
                          : "text-slate-700 hover:bg-slate-100"
                      }`}>
                        Basic Info
                      </span>
                    </Link>
                    <Link href="/client-passwords">
                      <span className={`flex items-center px-3 py-2 ml-8 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                        isActive("/client-passwords") 
                          ? "bg-primary/10 text-primary" 
                          : "text-slate-700 hover:bg-slate-100"
                      }`}>
                        Client Passwords
                      </span>
                    </Link>
                  </CollapsibleContent>
                </Collapsible>
                
                {/* Roadmaps Dropdown */}
                <Collapsible open={roadmapsOpen} onOpenChange={setRoadmapsOpen}>
                  <CollapsibleTrigger className="w-full flex items-center justify-between px-3 py-2 ml-4 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg">
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-2" />
                      <span>Roadmaps</span>
                    </div>
                    <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${roadmapsOpen ? 'rotate-90' : ''}`} />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-1 mt-1">
                    <Link href="/roadmaps/internal">
                      <span className={`flex items-center px-3 py-2 ml-8 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                        isActive("/roadmaps/internal") 
                          ? "bg-primary/10 text-primary" 
                          : "text-slate-700 hover:bg-slate-100"
                      }`}>
                        Internal
                      </span>
                    </Link>
                    <Link href="/roadmaps/client">
                      <span className={`flex items-center px-3 py-2 ml-8 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                        isActive("/roadmaps/client") 
                          ? "bg-primary/10 text-primary" 
                          : "text-slate-700 hover:bg-slate-100"
                      }`}>
                        Client
                      </span>
                    </Link>
                  </CollapsibleContent>
                </Collapsible>
                
                {/* HR Dropdown */}
                <Collapsible open={hrOpen} onOpenChange={setHROpen}>
                  <CollapsibleTrigger className="w-full flex items-center justify-between px-3 py-2 ml-4 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg">
                    <div className="flex items-center">
                      <Briefcase className="w-4 h-4 mr-2" />
                      <span>HR</span>
                    </div>
                    <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${hrOpen ? 'rotate-90' : ''}`} />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-1 mt-1">
                    <Link href="/hr-dashboard">
                      <span className={`flex items-center px-3 py-2 ml-8 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                        isActive("/hr-dashboard") 
                          ? "bg-primary/10 text-primary" 
                          : "text-slate-700 hover:bg-slate-100"
                      }`}>
                        Dashboard
                      </span>
                    </Link>
                    <Link href="/hr-sops">
                      <span className={`flex items-center px-3 py-2 ml-8 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                        isActive("/hr-sops") 
                          ? "bg-primary/10 text-primary" 
                          : "text-slate-700 hover:bg-slate-100"
                      }`}>
                        SOPs
                      </span>
                    </Link>
                    <Link href="/hr-kpis">
                      <span className={`flex items-center px-3 py-2 ml-8 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                        isActive("/hr-kpis") 
                          ? "bg-primary/10 text-primary" 
                          : "text-slate-700 hover:bg-slate-100"
                      }`}>
                        KPIs
                      </span>
                    </Link>
                  </CollapsibleContent>
                </Collapsible>
                
                {/* Hub Dropdown */}
                <Collapsible open={hubOpen} onOpenChange={setHubOpen}>
                  <CollapsibleTrigger className="w-full flex items-center justify-between px-3 py-2 ml-4 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg">
                    <div className="flex items-center">
                      <Layout className="w-4 h-4 mr-2" />
                      <span>Hub</span>
                    </div>
                    <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${hubOpen ? 'rotate-90' : ''}`} />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-1 mt-1">
                    <Link href="/hub/project-management">
                      <span className={`flex items-center px-3 py-2 ml-8 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                        isActive("/hub/project-management") 
                          ? "bg-primary/10 text-primary" 
                          : "text-slate-700 hover:bg-slate-100"
                      }`}>
                        <KanbanSquare className="w-4 h-4 mr-2" />
                        Tasks/Projects
                      </span>
                    </Link>
                    <Link href="/hub/docs-sheets">
                      <span className={`flex items-center px-3 py-2 ml-8 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                        isActive("/hub/docs-sheets") 
                          ? "bg-primary/10 text-primary" 
                          : "text-slate-700 hover:bg-slate-100"
                      }`}>
                        <FolderTree className="w-4 h-4 mr-2" />
                        Docs/Sheets
                      </span>
                    </Link>
                  </CollapsibleContent>
                </Collapsible>
                
                {/* Lead Management */}
                {hasTeamAccess("lead-management") && (
                  <Link href="/lead-management">
                    <span className={`flex items-center px-3 py-2 ml-4 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                      isActive("/lead-management") 
                        ? "bg-primary/10 text-primary" 
                        : "text-slate-700 hover:bg-slate-100"
                    }`}>
                      <TrendingUp className="w-5 h-5 mr-3" />
                      Lead Management
                    </span>
                  </Link>
                )}
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* Admin Tools Section - only show if user has access to any admin tools */}
          {hasAnyAdminToolAccess() && (
            <div className="pt-4">
              <div className="px-3 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider">
                Admin Tools
              </div>
              <div className="space-y-1 mt-1">
              {hasTeamAccess("client-profiles") && (
                <Link href="/clients">
                  <span className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    isActive("/clients") 
                      ? "bg-primary/10 text-primary" 
                      : "text-slate-700 hover:bg-slate-100"
                  }`}>
                    <Users className="w-5 h-5 mr-3" />
                    Creators
                  </span>
                </Link>
              )}

              {hasTeamAccess("employee-management") && (
                <Link href="/employee-management">
                  <span className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    isActive("/employee-management") 
                      ? "bg-primary/10 text-primary" 
                      : "text-slate-700 hover:bg-slate-100"
                  }`}>
                    <Users className="w-5 h-5 mr-3" />
                    Employee Management
                  </span>
                </Link>
              )}

              {(employee?.massAccess || employee?.accessLevel === 'admin') && (
                <Link href="/security-admin">
                  <span className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    isActive("/security-admin") 
                      ? "bg-primary/10 text-primary" 
                      : "text-slate-700 hover:bg-slate-100"
                  }`}>
                    <Shield className="w-5 h-5 mr-3" />
                    Security Management
                  </span>
                </Link>
              )}





              {hasTeamAccess("inspiration-dashboard") && (
                <Link href="/inspiration-dashboard">
                  <span className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive("/inspiration-dashboard") 
                      ? "bg-primary/10 text-primary" 
                      : "text-slate-700 hover:bg-slate-100"
                  }`}>
                    <Sparkles className="w-5 h-5 mr-3" />
                    Inspiration Dashboard
                  </span>
                </Link>
              )}

              {hasTeamAccess("new-client-onboarding") && (
                <Link href="/new-client-onboarding">
                  <span className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive("/new-client-onboarding") 
                      ? "bg-primary/10 text-primary" 
                      : "text-slate-700 hover:bg-slate-100"
                  }`}>
                    <Plus className="w-5 h-5 mr-3" />
                    New Client Onboarding
                  </span>
                </Link>
              )}

              {hasTeamAccess("health-score-system") && (
                <Link href="/health-score-system">
                  <span className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive("/health-score-system") 
                      ? "bg-primary/10 text-primary" 
                      : "text-slate-700 hover:bg-slate-100"
                  }`}>
                    <Heart className="w-5 h-5 mr-3" />
                    Health Score System
                  </span>
                </Link>
              )}







              {(hasTeamAccess("crm-guide-admin") || teamPermissions?.massAccess) && (
                <Link href="/help-admin">
                  <span className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive("/help-admin") 
                      ? "bg-primary/10 text-primary" 
                      : "text-slate-700 hover:bg-slate-100"
                  }`}>
                    <Shield className="w-5 h-5 mr-3" />
                    Help Page Management
                  </span>
                </Link>
              )}

              {(hasTeamAccess("aesthetic-builder-admin") || teamPermissions?.massAccess) && (
                <Link href="/aesthetic-builder-admin">
                  <span className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive("/aesthetic-builder-admin") 
                      ? "bg-primary/10 text-primary" 
                      : "text-slate-700 hover:bg-slate-100"
                  }`}>
                    <Palette className="w-5 h-5 mr-3" />
                    Aesthetic Manager
                  </span>
                </Link>
              )}

              {hasTeamAccess("settings") && (
                <Link href="/settings">
                  <span className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive("/settings") 
                      ? "bg-primary/10 text-primary" 
                      : "text-foreground dark:text-foreground hover:bg-muted dark:hover:bg-muted"
                  }`}>
                    <Settings className="w-5 h-5 mr-3" />
                    Settings
                  </span>
                </Link>
              )}
              </div>
            </div>
          )}
        </nav>
      </div>

      {/* User Profile Section - Fixed at bottom */}
      <div className="flex-shrink-0 border-t border-border dark:border-border">
        <div className="p-4 space-y-3">
          {/* User Info */}
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={employee?.profileImageUrl || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground dark:text-foreground truncate">
                {employee?.firstName && employee?.lastName 
                  ? `${employee.firstName} ${employee.lastName}`
                  : employee?.firstName || employee?.email || 'User'}
              </p>
              <p className="text-xs text-muted-foreground dark:text-muted-foreground truncate">{employee?.email}</p>
              <div className="flex items-center mt-1">
                <Badge variant="secondary" className="text-xs">
                  {employee?.accessLevel === 'admin' ? 'Admin' : 'Employee'}
                </Badge>
                {employee?.massAccess && (
                  <Badge variant="outline" className="text-xs ml-1">
                    Full Access
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Sign Out Button */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/20 border-red-200 dark:border-red-800"
                disabled={isLoggingOut}
              >
                <LogOut className="w-4 h-4 mr-2" />
                {isLoggingOut ? 'Signing out...' : 'Sign Out'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Sign Out</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to sign out? You'll need to log in again to access the CRM.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={async () => {
                    setIsLoggingOut(true);
                    try {
                      await logout();
                    } catch (error) {
                      console.error('Logout error:', error);
                      toast({
                        title: "Error",
                        description: "There was an issue signing out. Please try again.",
                        variant: "destructive",
                      });
                      setIsLoggingOut(false);
                    }
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Sign Out
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </aside>
  );
}