import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { getApiUrl } from "@/lib/api-config";
import { queryConfigs, performanceMonitor, employeeCache } from "@/lib/crm-optimization";
import { initializeMobileOptimizations } from "@/lib/mobile-optimization";
import { healthMonitor } from "@/lib/health-monitoring";

// Declare Highlight.io global interface
declare global {
  interface Window {
    H: {
      init: (projectId: string, options?: {
        environment?: string;
        version?: string;
        networkRecording?: {
          enabled?: boolean;
          recordHeadersAndBody?: boolean;
          urlBlocklist?: string[];
        };
      }) => void;
      identify: (userId: string, userProperties?: Record<string, any>) => void;
    };
  }
}

// Employee user interface
interface Employee {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  teamId: number | null;
  isActive: boolean;
  massAccess: boolean;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
  permissions?: Permission[];
  accessLevel?: 'admin' | 'employee';
}

// Permission interfaces
interface Permission {
  id: number;
  departmentId?: number;
  pageId?: number;
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

interface CrmAuthContextType {
  employee: Employee | null;
  permissions: Permission[];
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, redirectTo?: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (resource: string, action: 'view' | 'edit' | 'delete') => boolean;
  hasDepartmentAccess: (departmentId: number, action: 'view' | 'edit' | 'delete') => boolean;
  hasPageAccess: (pageId: number, action: 'view' | 'edit' | 'delete') => boolean;
  saveIntendedRoute: (route: string) => void;
  clearIntendedRoute: () => void;
  getIntendedRoute: () => string | null;
}

const CrmAuthContext = createContext<CrmAuthContextType | null>(null);

async function apiRequest(method: string, url: string, data?: any) {
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  };
  
  if (data) {
    options.body = JSON.stringify(data);
  }
  
  const fullUrl = getApiUrl(url);
  console.log(`Making ${method} request to:`, fullUrl);
  
  try {
    const response = await fetch(fullUrl, options);
    console.log(`Response status: ${response.status} for ${fullUrl}`);
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No error details');
      console.error(`API Error (${response.status}):`, errorText);
      
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
      }
      
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }
    
    return response;
  } catch (error) {
    console.error('Network error:', error);
    
    // Enhanced error handling for production cross-origin issues
    if (window.location.hostname === 'tastyyyy.com' && error instanceof TypeError) {
      console.log('Production cross-origin error detected, enhancing error message');
      throw new Error('Authentication service connection failed. Please refresh the page and try again.');
    }
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Unable to connect to server. Please check your network connection.');
    }
    throw error;
  }
}

// Utility functions for route memory and persistent sessions
const ROUTE_MEMORY_KEY = 'crm_intended_route';
const SESSION_KEY = 'crm_session_active';

function saveIntendedRoute(route: string) {
  if (route && route !== '/login' && route !== '/') {
    localStorage.setItem(ROUTE_MEMORY_KEY, route);
  }
}

function getIntendedRoute(): string | null {
  return localStorage.getItem(ROUTE_MEMORY_KEY);
}

function clearIntendedRoute() {
  localStorage.removeItem(ROUTE_MEMORY_KEY);
}

function hasValidSession(): boolean {
  return localStorage.getItem(SESSION_KEY) === 'true';
}

export function CrmAuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location, setLocation] = useLocation();
  const [isInitialized, setIsInitialized] = useState(false);

  // Check if current route is a public route that should skip authentication
  const isPublicRoute = location.startsWith('/team-form/') || location === '/creator-setup' || location.startsWith('/review/');

  // Enhanced query for persistent authentication with comprehensive session validation
  const {
    data: employee,
    isLoading: employeeLoading,
    error: employeeError,
  } = useQuery({
    queryKey: ['/api/auth/user'],
    enabled: !isPublicRoute, // Skip auth query for public routes
    queryFn: async () => {
      try {
        console.log('Checking for persistent employee authentication session...');
        
        const response = await apiRequest('GET', '/api/employee-auth/status');
        const userData = await response.json();
        
        console.log('Persistent employee authentication found:', userData.email, 'Session valid:', userData.sessionValid);
        
        // Store session indicator for auto-redirect with enhanced persistence info
        if (userData) {
          localStorage.setItem('crm_session_active', 'true');
          localStorage.setItem('crm_last_activity', userData.lastActivity || new Date().toISOString());
          
          // Identify user in Highlight.io for session replay and error tracking
          if (typeof window !== 'undefined' && window.H) {
            window.H.identify(userData.email, {
              id: userData.id,
              accessLevel: userData.accessLevel || (userData.massAccess ? 'admin' : 'employee'),
              team: userData.teamId?.toString() || 'none',
              massAccess: userData.massAccess,
              firstName: userData.firstName,
              lastName: userData.lastName,
              persistentLogin: true,
              sessionValid: userData.sessionValid,
              lastActivity: userData.lastActivity
            });
          }
        }
        
        return userData;
      } catch (error) {
        if (error instanceof Error && error.message.includes('401')) {
          console.log('No valid employee session found, clearing storage indicators');
          localStorage.removeItem('crm_session_active');
          localStorage.removeItem('crm_last_activity');
          return null;
        }
        throw error;
      }
    },
    retry: false,
    ...queryConfigs.auth, // Use optimized configuration for authentication
    refetchOnMount: true, // Always check on component mount
    refetchOnWindowFocus: !isPublicRoute, // Check when window regains focus
    refetchInterval: isPublicRoute ? false : 1000 * 60 * 10, // Check every 10 minutes for session extension
  });

  // Query for employee permissions
  const {
    data: permissions = [],
    isLoading: permissionsLoading,
  } = useQuery({
    queryKey: ['/api/auth/permissions'],
    queryFn: async () => {
      if (!employee) return [];
      try {
        const response = await apiRequest('GET', '/api/auth/permissions');
        return await response.json();
      } catch (error) {
        return [];
      }
    },
    enabled: !!employee && !isPublicRoute, // Skip permissions query for public routes
    ...queryConfigs.permissions, // Use optimized configuration for permissions
    retry: false,
  });

  // Login mutation with unified routing logic
  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const response = await apiRequest('POST', '/api/employee-auth/login', { email, password });
      return await response.json();
    },
    onSuccess: (data) => {
      console.log('Login successful, user data:', data);
      
      // Enhanced authentication state management with session persistence
      const enhancedUserData = {
        ...data,
        isAuthenticated: true,
        sessionValid: true,
        sessionID: data.sessionID || 'login-session',
        loginTime: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      };
      
      // Immediately update authentication state in query cache with enhanced data
      queryClient.setQueryData(['/api/auth/user'], enhancedUserData);
      
      // Store session indicator for auto-redirect
      localStorage.setItem(SESSION_KEY, 'true');
      localStorage.setItem('crm_last_activity', Date.now().toString());
      

      
      // Identify user in Highlight.io for session replay and error tracking
      if (typeof window !== 'undefined' && window.H) {
        window.H.identify(data.email, {
          id: data.id,
          accessLevel: data.accessLevel || (data.massAccess ? 'admin' : 'employee'),
          team: data.teamId?.toString() || 'none',
          massAccess: data.massAccess,
          firstName: data.firstName,
          lastName: data.lastName,
          persistentLogin: true,
          sessionValid: true
        });
      }
      
      // Wait for session to be fully established before redirect - increased delay for session persistence
      setTimeout(() => {
        // Refresh the auth query to ensure it picks up the new session
        queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
        
        // Invalidate all data queries to ensure fresh data after login
        queryClient.invalidateQueries({ queryKey: ['/api/content-trips/upcoming'] });
        queryClient.invalidateQueries({ queryKey: ['/api/content-trips'] });
        queryClient.invalidateQueries({ queryKey: ['/api/creators'] });
        queryClient.invalidateQueries({ queryKey: ['/api/inspo-pages'] });
        queryClient.invalidateQueries({ queryKey: ['/api/group-chats'] });
        queryClient.invalidateQueries({ queryKey: ['/api/priority-content'] });
        queryClient.invalidateQueries({ queryKey: ['/api/auth/permissions'] });
        queryClient.invalidateQueries({ queryKey: ['/api/auth/team-permissions'] });
        
        // Invalidate any attendance queries that might have authentication errors cached
        queryClient.invalidateQueries({ 
          predicate: (query) => {
            const queryKeyStr = query.queryKey.join('/');
            return queryKeyStr.includes('content-trips') && queryKeyStr.includes('attendance');
          }
        });
        
        // Longer delay to ensure session is fully persisted to database
        setTimeout(() => {
          const intendedRoute = getIntendedRoute();
          if (intendedRoute) {
            clearIntendedRoute();
            setLocation(intendedRoute);
            toast({
              title: "Welcome back!",
              description: `Redirected to ${intendedRoute}`,
            });
          } else {
            setLocation('/');
            // Determine welcome message based on access level
            const accessType = data.massAccess ? 'full admin access' : 'employee access';
            
            toast({
              title: "Welcome back",
              description: `Successfully signed in with ${accessType}`,
            });
          }
        }, 500);
      }, 1000);
    },
    onError: (error: Error) => {
      toast({
        title: "Authentication failed",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    },
  });

  // Complete logout mutation with total session cleanup
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/employee-auth/logout');
      return await response.json();
    },
    onSuccess: (data) => {
      console.log('Logout response:', data);
      
      // COMPREHENSIVE QUERY INVALIDATION AND CLEANUP
      // Invalidate all authentication-related queries first
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/permissions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/team-permissions'] });
      
      // Invalidate all data queries to force fresh fetch on next login
      queryClient.invalidateQueries({ queryKey: ['/api/priority-content'] });
      queryClient.invalidateQueries({ queryKey: ['/api/creators'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/inspo-pages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/content-trips'] });
      queryClient.invalidateQueries({ queryKey: ['/api/group-chats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/calendar'] });
      queryClient.invalidateQueries({ queryKey: ['/api/customs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/teams'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reports'] });
      
      // Set auth data to null before removing
      queryClient.setQueryData(['/api/auth/user'], null);
      queryClient.setQueryData(['/api/auth/permissions'], null);
      queryClient.setQueryData(['/api/auth/team-permissions'], null);
      
      // Remove all queries from cache
      queryClient.removeQueries({ queryKey: ['/api/auth/user'] });
      queryClient.removeQueries({ queryKey: ['/api/auth/permissions'] });
      queryClient.removeQueries({ queryKey: ['/api/auth/team-permissions'] });
      queryClient.removeQueries({ queryKey: ['/api/priority-content'] });
      queryClient.removeQueries({ queryKey: ['/api/creators'] });
      queryClient.removeQueries({ queryKey: ['/api/users'] });
      queryClient.removeQueries({ queryKey: ['/api/inspo-pages'] });
      queryClient.removeQueries({ queryKey: ['/api/content-trips'] });
      queryClient.removeQueries({ queryKey: ['/api/group-chats'] });
      queryClient.removeQueries({ queryKey: ['/api/calendar'] });
      queryClient.removeQueries({ queryKey: ['/api/customs'] });
      queryClient.removeQueries({ queryKey: ['/api/teams'] });
      queryClient.removeQueries({ queryKey: ['/api/reports'] });
      
      // Nuclear option - clear all query cache
      queryClient.clear();
      
      // Clear ALL localStorage auth-related data
      localStorage.removeItem('crm_session_active');
      localStorage.removeItem('creator_session_active');
      localStorage.removeItem('crm_intended_route');
      localStorage.removeItem('authenticated');
      localStorage.removeItem('session');
      localStorage.removeItem('crm_last_activity');
      localStorage.removeItem('creator_jwt_token');
      localStorage.removeItem('creator_mobile_auth');
      localStorage.removeItem('creator_mobile_id');
      localStorage.removeItem('creator_mobile_username');
      
      // Clear sessionStorage as well
      sessionStorage.removeItem('crm_session_active');
      sessionStorage.removeItem('creator_session_active');
      sessionStorage.removeItem('authenticated');
      sessionStorage.clear();
      
      console.log('COMPREHENSIVE logout cleanup performed - all queries invalidated and storage cleared');
      
      toast({
        title: "Signed out successfully",
        description: "All data cleared. You have been completely logged out.",
      });
      
      // Small delay to ensure state is fully cleared before redirect
      setTimeout(() => {
        window.location.href = '/login';
      }, 100);
    },
    onError: (error: Error) => {
      console.error('Logout error:', error);
      
      // Even if server logout fails, clear frontend state completely
      // Invalidate all queries first
      queryClient.invalidateQueries();
      
      // Then clear all cache
      queryClient.clear();
      
      // Nuclear option for auth issues - clear all storage
      localStorage.clear();
      sessionStorage.clear();
      
      console.log('Emergency logout cleanup performed due to error');
      
      toast({
        title: "Logout completed",
        description: "Session cleared locally due to connection issue",
        variant: "destructive",
      });
      
      // Force redirect even on error
      window.location.replace('/login');
    },
  });

  // Permission checking functions
  const hasPermission = (resource: string, action: 'view' | 'edit' | 'delete'): boolean => {
    if (!employee || !employee.isActive) return false;
    
    // Mass access override
    if (employee.massAccess) return true;
    
    // Admin role has all permissions
    if (employee.role === 'admin') return true;
    
    // Check specific permissions
    const permission = permissions.find((p: Permission) => 
      (p.departmentId && resource.includes(p.departmentId.toString())) ||
      (p.pageId && resource.includes(p.pageId.toString()))
    );
    
    if (!permission) return false;
    
    switch (action) {
      case 'view':
        return permission.canView;
      case 'edit':
        return permission.canEdit;
      case 'delete':
        return permission.canDelete;
      default:
        return false;
    }
  };

  const hasDepartmentAccess = (departmentId: number, action: 'view' | 'edit' | 'delete'): boolean => {
    if (!employee) return false;
    
    // Mass access override
    if (employee.massAccess) return true;
    
    // Admin role has all permissions
    if (employee.role === 'admin') return true;
    
    const permission = permissions.find((p: Permission) => p.departmentId === departmentId);
    if (!permission) return false;
    
    switch (action) {
      case 'view':
        return permission.canView;
      case 'edit':
        return permission.canEdit;
      case 'delete':
        return permission.canDelete;
      default:
        return false;
    }
  };

  const hasPageAccess = (pageId: number, action: 'view' | 'edit' | 'delete'): boolean => {
    if (!employee) return false;
    
    // Mass access override
    if (employee.massAccess) return true;
    
    // Admin role has all permissions
    if (employee.role === 'admin') return true;
    
    const permission = permissions.find((p: Permission) => p.pageId === pageId);
    if (!permission) return false;
    
    switch (action) {
      case 'view':
        return permission.canView;
      case 'edit':
        return permission.canEdit;
      case 'delete':
        return permission.canDelete;
      default:
        return false;
    }
  };

  // Route memory functions for persistent login
  const saveIntendedRoute = (route: string) => {
    localStorage.setItem('crm_intended_route', route);
  };

  const getIntendedRoute = (): string | null => {
    return localStorage.getItem('crm_intended_route');
  };

  const clearIntendedRoute = () => {
    localStorage.removeItem('crm_intended_route');
  };

  // Initialize authentication state and handle persistent sessions
  useEffect(() => {
    if (!employeeLoading && !isInitialized) {
      setIsInitialized(true);
      
      // Initialize performance optimizations
      if (typeof window !== 'undefined') {
        console.log('🚀 Initializing CRM performance optimizations...');
        
        // Initialize mobile optimizations
        initializeMobileOptimizations();
        
        // Initialize health monitoring
        healthMonitor.initialize();
        
        // Track performance metrics
        performanceMonitor.trackAPICall('crm_initialization', performance.now());
        
        console.log('✅ CRM performance optimizations initialized');
      }
      
      // Handle route memory for unauthenticated users on protected routes
      // Exclude creator-specific routes and public routes from automatic redirect
      const isCreatorRoute = location.startsWith('/creator') || location === '/creatorlogin';
      const isTeamFormRoute = location.startsWith('/team-form/');
      const isTripInviteRoute = location.startsWith('/trip-invite/');
      const isInvitationRoute = location === '/invitation';
      const isReviewRoute = location.startsWith('/review/');
      const isHelpRoute = location === '/help';
      const isPublicRouteCheck = isCreatorRoute || isTeamFormRoute || isTripInviteRoute || isInvitationRoute || isReviewRoute || isHelpRoute;
      
      // Only redirect to login if user is not authenticated and trying to access protected routes
      const isActuallyAuthenticated = employee && employee.sessionValid !== false && !employee.message?.includes('Not authenticated');
      
      if (!isActuallyAuthenticated && location !== '/login' && location !== '/' && !isPublicRouteCheck) {
        console.log(`Saving intended route: ${location}`);
        saveIntendedRoute(location);
        setLocation('/login');
      } else if (isPublicRouteCheck) {
        console.log(`CrmAuthContext - Allowing public route access: ${location}`);
      }
    }
  }, [employeeLoading, isInitialized, employee, location, setLocation]);

  // Handle automatic redirection for authenticated users
  useEffect(() => {
    // Only redirect if user is actually authenticated (not just if employee object exists)
    const isActuallyAuthenticated = employee && employee.sessionValid !== false && !employee.message?.includes('Not authenticated');
    
    if (isActuallyAuthenticated && isInitialized) {
      // If user is on login page but authenticated, redirect to intended route or dashboard
      if (location === '/login') {
        const intendedRoute = getIntendedRoute();
        if (intendedRoute) {
          clearIntendedRoute();
          setLocation(intendedRoute);
          console.log(`Auto-redirecting authenticated user to: ${intendedRoute}`);
        } else {
          setLocation('/');
          console.log('Auto-redirecting authenticated user to dashboard');
        }
      }
    }
  }, [employee, isInitialized, location, setLocation]);

  const contextValue: CrmAuthContextType = {
    employee: employee || null,
    permissions,
    isLoading: employeeLoading || permissionsLoading || !isInitialized || loginMutation.isPending,
    isAuthenticated: !!employee && employee.sessionValid !== false && !employee.message?.includes('Not authenticated') && employee.isAuthenticated !== false,
    login: async (email: string, password: string) => {
      await loginMutation.mutateAsync({ email, password });
    },
    logout: async () => {
      await logoutMutation.mutateAsync();
    },
    hasPermission,
    hasDepartmentAccess,
    hasPageAccess,
    saveIntendedRoute,
    clearIntendedRoute,
    getIntendedRoute,
  };

  return (
    <CrmAuthContext.Provider value={contextValue}>
      {children}
    </CrmAuthContext.Provider>
  );
}

export function useCrmAuth() {
  const context = useContext(CrmAuthContext);
  if (!context) {
    throw new Error("useCrmAuth must be used within a CrmAuthProvider");
  }
  return context;
}