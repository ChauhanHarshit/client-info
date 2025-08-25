import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getApiUrl } from "./config";
import { healthMonitor, withHealthMonitoring } from "./health-monitor";
import { performanceMonitor, errorHandler } from "./performance-utils";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    
    // Handle 404 errors by redirecting to login page, but NOT for aesthetic template errors
    if (res.status === 404 && !res.url.includes('current-aesthetic')) {
      // Use window.location to force redirect on 404
      if (typeof window !== 'undefined') {
        setTimeout(() => {
          window.location.href = '/login';
        }, 1000); // Small delay to allow error to be logged
      }
    }
    
    throw new Error(`${res.status}: ${text}`);
  }
}

// Token refresh function
async function refreshTokenIfNeeded(): Promise<boolean> {
  try {
    const refreshUrl = '/api/auth/refresh';
    
    const res = await fetch(refreshUrl, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      }
    });
    
    if (res.ok) {
      const data = await res.json();
      if (data.authenticated && data.message === 'Tokens refreshed successfully') {
        
        // Trigger comprehensive cache invalidation after successful token refresh
        if (typeof window !== 'undefined') {
          // Wait a moment for the new tokens to be available, then force cache clear
          setTimeout(() => {
            // Import queryClient dynamically to avoid circular dependency
            import('./queryClient').then(({ queryClient }) => {
              
              // Remove all Priority Content related queries
              queryClient.removeQueries({ queryKey: ["/api/priority-content"] });
              queryClient.invalidateQueries({ queryKey: ["/api/priority-content"] });
              
              // Remove all creators queries
              queryClient.removeQueries({ queryKey: ["/api/creators"] });
              queryClient.invalidateQueries({ queryKey: ["/api/creators"] });
              
              // Clear all auth-related caches to force fresh authentication state
              queryClient.removeQueries({ 
                predicate: (query) => {
                  return query.queryKey.some(key => 
                    typeof key === 'string' && (
                      key.includes('/auth/') || 
                      key.includes('/employee-auth/') ||
                      key.includes('/priority-content') ||
                      key.includes('/creators')
                    )
                  );
                }
              });
              
              // Trigger page reload to ensure fresh authentication state
              setTimeout(() => {
                window.location.reload();
              }, 500);
            });
          }, 200);
        }
        
        return true;
      }
    } else {
      const errorData = await res.json().catch(() => null);
    }
    
    return false;
  } catch (error) {
    return false;
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  _retryCount: number = 0
): Promise<Response> {
  const isFormData = data instanceof FormData;
  
  // Use relative URLs for same-origin requests to avoid CORS issues
  let apiUrl = url.startsWith('http') ? url : url;
  
  // CRITICAL VALIDATION: Prevent invalid media content submissions
  if (isFormData && url.includes('/content')) {
    const mediaType = data.get('mediaType');
    const fileEntry = data.get('file');
    const originalPostLink = data.get('originalPostLink');
    const audioLink = data.get('audioLink');
    const title = data.get('title');
    

    
    // Block video/image content without proper file or URL
    if ((mediaType === 'video' || mediaType === 'image') && !fileEntry && !originalPostLink) {
      throw new Error(`VALIDATION_ERROR: ${mediaType} content requires either an uploaded file or valid external URL`);
    }
    
    // Block any content with placeholder-like file URLs in originalPostLink (not audioLink)
    if (originalPostLink && typeof originalPostLink === 'string') {
      const urlStr = originalPostLink.toString().trim();
      // Only validate originalPostLink if it looks like placeholder text and not a proper URL
      if (urlStr && !urlStr.startsWith('/uploads/') && !urlStr.startsWith('http') && !urlStr.includes('.') && urlStr.length < 20 && !urlStr.match(/^[a-zA-Z0-9_-]+$/)) {
        console.error('❌ CRITICAL VALIDATION FAILED: Suspicious originalPostLink URL detected:', urlStr);
        throw new Error(`VALIDATION_ERROR: Invalid originalPostLink URL format: ${urlStr} Only uploaded files or valid http/https URLs are allowed.`);
      }
    }
    
    // audioLink can be any value - no validation needed as it's just a reference
  }
  
  const headers: Record<string, string> = isFormData ? {} : (data ? { "Content-Type": "application/json" } : {});
  
  // Add JWT Authorization header for mobile browsers
  if (typeof window !== 'undefined') {
    const jwtToken = localStorage.getItem('creator_jwt_token');
    if (jwtToken) {
      headers['Authorization'] = `Bearer ${jwtToken}`;
    }
  }
  
  // Use performance monitoring for API requests
  return withHealthMonitoring(url, async () => {
    try {
      const res = await fetch(apiUrl, {
        method,
        headers,
        body: isFormData ? data as FormData : (data ? JSON.stringify(data) : undefined),
        credentials: "include",
        // Add timeout and signal for better error handling
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });
      
      // Check if we got a 401 and should try to refresh token
      if (res.status === 401 && _retryCount === 0 && !url.includes('/auth/')) {
        const refreshSuccessful = await refreshTokenIfNeeded();
        
        if (refreshSuccessful) {
          
          // Wait for the token to be available in cookies
          await new Promise(resolve => setTimeout(resolve, 200));
          
          // Retry with fresh headers that include new JWT token
          const freshHeaders: Record<string, string> = isFormData ? {} : (data ? { "Content-Type": "application/json" } : {});
          
          // Re-add JWT Authorization header for mobile browsers with fresh token
          if (typeof window !== 'undefined') {
            const jwtToken = localStorage.getItem('creator_jwt_token');
            if (jwtToken) {
              freshHeaders['Authorization'] = `Bearer ${jwtToken}`;
            }
          }
          
          const retryRes = await fetch(apiUrl, {
            method,
            headers: freshHeaders,
            body: isFormData ? data as FormData : (data ? JSON.stringify(data) : undefined),
            credentials: "include",
          });
          
          await throwIfResNotOk(retryRes);
          return retryRes;
        }
      }
      
      await throwIfResNotOk(res);
      return res;
    } catch (error) {
      errorHandler.logError(error as Error, `API Request ${method} ${url}`);
      throw error;
    }
  });
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    let retryCount = 0;
    const url = queryKey[0] as string;
    // Use relative URLs for same-origin requests to avoid CORS issues
    let apiUrl = url.startsWith('http') ? url : url;
    
    try {
      // Add JWT Authorization header for mobile browsers and creator requests
      const headers: Record<string, string> = {};
      if (typeof window !== 'undefined') {
        const jwtToken = localStorage.getItem('creator_jwt_token');
        if (jwtToken) {
          headers['Authorization'] = `Bearer ${jwtToken}`;
        }
      }
      
      const res = await fetch(apiUrl, {
        credentials: "include",
        headers
      });

      // Check if we got a 401 and should try to refresh token
      if (res.status === 401 && retryCount === 0 && !url.includes('/auth/')) {
        const refreshSuccessful = await refreshTokenIfNeeded();
        
        if (refreshSuccessful) {
          
          // Wait for the token to be available in cookies
          await new Promise(resolve => setTimeout(resolve, 200));
          
          // Retry the query with fresh headers that include new JWT token
          const freshHeaders: Record<string, string> = {};
          if (typeof window !== 'undefined') {
            const jwtToken = localStorage.getItem('creator_jwt_token');
            if (jwtToken) {
              freshHeaders['Authorization'] = `Bearer ${jwtToken}`;
            }
          }
          
          const freshRes = await fetch(apiUrl, {
            credentials: "include",
            headers: freshHeaders
          });
          await throwIfResNotOk(freshRes);
          return await freshRes.json();
        }
      }

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      const data = await res.json();
      
      return data;
    } catch (error: any) {
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: 60000, // Refresh data every 60 seconds (less aggressive)
      refetchOnWindowFocus: false, // Disable to reduce unnecessary requests
      refetchOnReconnect: true, // Refresh after network reconnect
      staleTime: 30000, // Data considered fresh for 30 seconds (better caching)
      gcTime: 300000, // Keep data in cache for 5 minutes (better performance)
      retry: 2, // Retry failed requests twice with exponential backoff
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: false,
    },
  },
});
