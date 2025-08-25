import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLocation } from 'wouter';
import { getApiUrl } from '@/lib/config';

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

interface CreatorAuthState {
  isCreatorAuthenticated: boolean;
  creatorId: number | null;
  creatorUsername: string | null;
  isLoading: boolean;
}

interface CreatorAuthContextType extends CreatorAuthState {
  setCreatorAuth: (creatorId: number, username: string) => void;
  clearCreatorAuth: () => void;
}

const CreatorAuthContext = createContext<CreatorAuthContextType | null>(null);

export function CreatorAuthProvider({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [authState, setAuthState] = useState<CreatorAuthState>({
    isCreatorAuthenticated: false,
    creatorId: null,
    creatorUsername: null,
    isLoading: true,
  });

  // Check if current route is a public route that should skip authentication
  const isPublicRoute = location.startsWith('/team-form/') || location === '/creator-setup';

  useEffect(() => {
    // Skip authentication check for public routes
    if (isPublicRoute) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    // Check if creator is authenticated on mount
    checkCreatorAuth();
  }, [isPublicRoute]);

  const checkCreatorAuth = async () => {
    try {
      console.log('🔍 Checking for persistent creator authentication...');

      // Check for mobile-specific authentication state first
      const isMobile = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const mobileAuth = localStorage.getItem('creator_mobile_auth');
      const mobileId = localStorage.getItem('creator_mobile_id');
      const mobileUsername = localStorage.getItem('creator_mobile_username');

      if (isMobile && mobileAuth === 'true' && mobileId && mobileUsername) {
        console.log('📱 Mobile authentication state found in localStorage');
        setAuthState({
          isCreatorAuthenticated: true,
          creatorId: parseInt(mobileId),
          creatorUsername: mobileUsername,
          isLoading: false,
        });
        return;
      }

      // Check for any existing creator session indicators
      const sessionActive = localStorage.getItem('creator_session_active');
      if (sessionActive === 'true') {
        console.log('🔍 Creator session indicator found, checking server auth...');
      }

      // Use consistent API URL resolution for all requests
      let authUrl = getApiUrl('/api/creator-auth/status');

      // For production environments, ensure API requests go to Replit backend
      if (typeof window !== 'undefined' && 
          (window.location.hostname === 'tastyyyy.com' || 
           window.location.hostname === 'www.tastyyyy.com' || 
           window.location.hostname.includes('vercel.app'))) {
        authUrl = 'https://b911dd49-61eb-4d0b-b4c6-5c8fad3a1497-00-2d3umxy1xela5.spock.replit.dev/api/creator-auth/status';
      }

      // Check for JWT token in localStorage for mobile authentication
      const token = localStorage.getItem('creator_jwt_token');

      // Prepare headers with JWT token if available
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        console.log('🔍 Using JWT token for authentication check');
      }

      // Check persistent authentication status endpoint
      const response = await fetch(authUrl, {
        method: 'GET',
        headers: headers,
        credentials: 'include',
      });

      console.log('🔍 Creator auth status response:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('🔍 Creator auth status data:', data);

        if (data.isAuthenticated && data.creator?.id) {
          console.log('✅ Persistent creator authentication found:', data.creator.username, 'Session valid:', data.sessionValid);

          // Store session indicator for creator persistence
          localStorage.setItem('creator_session_active', 'true');
          localStorage.setItem('creator_last_activity', data.lastActivity || new Date().toISOString());

          // Identify creator in Highlight.io for session replay and error tracking
          if (typeof window !== 'undefined' && window.H) {
            window.H.identify(`creator-${data.creator.id}`, {
              id: data.creator.id,
              username: data.creator.username,
              userType: 'creator',
              displayName: data.creator.displayName || data.creator.username,
              persistentLogin: true,
              sessionValid: data.sessionValid,
              lastActivity: data.lastActivity
            });
          }

          setAuthState({
            isCreatorAuthenticated: true,
            creatorId: data.creator.id,
            creatorUsername: data.creator.username,
            isLoading: false,
          });
          return;
        } else if (data.isAuthenticated === false) {
          console.log('🔍 Creator auth explicitly false - user not authenticated');
        }
      } else {
        console.log('❌ Creator auth status failed with status:', response.status);
        const errorText = await response.text();
        console.log('❌ Creator auth status error:', errorText);
        
        // If we have session indicators but API fails, try to maintain auth state temporarily
        if (sessionActive === 'true') {
          console.log('🔄 API failed but session indicators present, checking localStorage fallback');
          const lastActivity = localStorage.getItem('creator_last_activity');
          if (lastActivity) {
            const lastActivityTime = new Date(lastActivity).getTime();
            const now = new Date().getTime();
            const timeSinceActivity = now - lastActivityTime;
            
            // If last activity was within 30 minutes, assume session is still valid
            if (timeSinceActivity < 30 * 60 * 1000) {
              console.log('🔄 Using localStorage fallback for recent session');
              // Try to get stored creator info
              const storedId = localStorage.getItem('creator_mobile_id') || localStorage.getItem('creator_stored_id');
              const storedUsername = localStorage.getItem('creator_mobile_username') || localStorage.getItem('creator_stored_username');
              
              if (storedId && storedUsername) {
                setAuthState({
                  isCreatorAuthenticated: true,
                  creatorId: parseInt(storedId),
                  creatorUsername: storedUsername,
                  isLoading: false,
                });
                return;
              }
            }
          }
        }
      }
    } catch (error) {
      console.log('❌ No persistent creator session found:', error);
      
      // Additional debugging for authentication failures
      if (error instanceof Error) {
        console.log('❌ Authentication error details:', error.message);
      }
    }

    // Always set loading to false, even on auth check failure
    console.log('🔄 Setting auth state to unauthenticated');

    // Clear persistent session indicators when authentication fails
    localStorage.removeItem('creator_session_active');
    localStorage.removeItem('creator_last_activity');

    setAuthState({
      isCreatorAuthenticated: false,
      creatorId: null,
      creatorUsername: null,
      isLoading: false,
    });
  };

  const setCreatorAuth = async (creatorId: number, username: string) => {
    console.log('🔧 Setting creator authentication state:', { creatorId, username });

    // Set immediate state for UI responsiveness
    setAuthState({
      isCreatorAuthenticated: true,
      creatorId,
      creatorUsername: username,
      isLoading: false,
    });

    // Set persistent session indicators
    localStorage.setItem('creator_session_active', 'true');
    localStorage.setItem('creator_last_activity', new Date().toISOString());

    // For mobile browsers, set additional mobile-specific persistence
    const isMobile = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (isMobile) {
      console.log('📱 Mobile authentication - setting mobile-specific persistence');
      localStorage.setItem('creator_mobile_auth', 'true');
      localStorage.setItem('creator_mobile_id', creatorId.toString());
      localStorage.setItem('creator_mobile_username', username);
      return;
    }

    // Only for desktop browsers - retry authentication check
    setTimeout(async () => {
      try {
        await checkCreatorAuth();
      } catch (error) {
        console.log('🔄 Desktop auth check failed, but keeping user state:', error);
      }
    }, 500);
  };

  const clearCreatorAuth = () => {
    // Clear persistent session indicators for creator logout
    localStorage.removeItem('creator_session_active');
    localStorage.removeItem('creator_last_activity');
    localStorage.removeItem('creator_jwt_token'); // Remove JWT token for mobile

    // Clear mobile-specific authentication state
    localStorage.removeItem('creator_mobile_auth');
    localStorage.removeItem('creator_mobile_id');
    localStorage.removeItem('creator_mobile_username');

    setAuthState({
      isCreatorAuthenticated: false,
      creatorId: null,
      creatorUsername: null,
      isLoading: false,
    });
  };

  return (
    <CreatorAuthContext.Provider value={{ ...authState, setCreatorAuth, clearCreatorAuth }}>
      {children}
    </CreatorAuthContext.Provider>
  );
}

export function useCreatorAuth() {
  const context = useContext(CreatorAuthContext);
  if (!context) {
    throw new Error('useCreatorAuth must be used within a CreatorAuthProvider');
  }
  return context;
}