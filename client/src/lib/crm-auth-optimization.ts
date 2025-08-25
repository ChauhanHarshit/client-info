/**
 * CRM Authentication Optimization System
 * Implements JWT-based auth with session fallback and connection pooling for 400+ employee scaling
 */

import { queryConfigs } from './crm-optimization';

// Enhanced authentication state management
interface AuthState {
  employee: any;
  permissions: string[];
  sessionValid: boolean;
  lastActivity: string;
  tokenExpiry: number;
  refreshToken?: string;
}

// JWT token management
class TokenManager {
  private static instance: TokenManager;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiry: number = 0;
  private refreshPromise: Promise<void> | null = null;

  static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager();
    }
    return TokenManager.instance;
  }

  setTokens(accessToken: string, refreshToken: string, expiresIn: number): void {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.tokenExpiry = Date.now() + (expiresIn * 1000);
    
    // Store in localStorage for persistence
    localStorage.setItem('crm_access_token', accessToken);
    localStorage.setItem('crm_refresh_token', refreshToken);
    localStorage.setItem('crm_token_expiry', this.tokenExpiry.toString());
  }

  getAccessToken(): string | null {
    // Check if token is expired
    if (this.tokenExpiry && Date.now() >= this.tokenExpiry) {
      this.clearTokens();
      return null;
    }
    
    return this.accessToken || localStorage.getItem('crm_access_token');
  }

  getRefreshToken(): string | null {
    return this.refreshToken || localStorage.getItem('crm_refresh_token');
  }

  isTokenValid(): boolean {
    return this.getAccessToken() !== null && Date.now() < this.tokenExpiry;
  }

  clearTokens(): void {
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiry = 0;
    this.refreshPromise = null;
    
    localStorage.removeItem('crm_access_token');
    localStorage.removeItem('crm_refresh_token');
    localStorage.removeItem('crm_token_expiry');
  }

  async refreshAccessToken(): Promise<void> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.performTokenRefresh();
    return this.refreshPromise;
  }

  private async performTokenRefresh(): Promise<void> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      this.setTokens(data.accessToken, data.refreshToken, data.expiresIn);
    } catch (error) {
      console.error('Token refresh error:', error);
      this.clearTokens();
      throw error;
    } finally {
      this.refreshPromise = null;
    }
  }
}

// Optimized authentication API client
class AuthAPIClient {
  private tokenManager: TokenManager;
  private baseURL: string;
  private requestQueue: Array<() => Promise<any>> = [];
  private processingQueue = false;

  constructor() {
    this.tokenManager = TokenManager.getInstance();
    this.baseURL = window.location.origin;
  }

  // Enhanced request method with automatic token refresh
  async request(endpoint: string, options: RequestInit = {}): Promise<Response> {
    let token = this.tokenManager.getAccessToken();
    
    // Try to refresh token if expired
    if (!token && this.tokenManager.getRefreshToken()) {
      try {
        await this.tokenManager.refreshAccessToken();
        token = this.tokenManager.getAccessToken();
      } catch (error) {
        console.error('Token refresh failed:', error);
        // Fallback to session-based authentication
        return this.sessionRequest(endpoint, options);
      }
    }

    // Add JWT token to headers
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers,
    });

    // Handle 401 responses by attempting token refresh
    if (response.status === 401 && token) {
      try {
        await this.tokenManager.refreshAccessToken();
        const newToken = this.tokenManager.getAccessToken();
        
        if (newToken) {
          headers['Authorization'] = `Bearer ${newToken}`;
          return fetch(`${this.baseURL}${endpoint}`, {
            ...options,
            headers,
          });
        }
      } catch (error) {
        console.error('Token refresh on 401 failed:', error);
      }
    }

    return response;
  }

  // Fallback to session-based authentication
  private async sessionRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    return fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include', // Include cookies for session-based auth
    });
  }

  // Batch multiple requests for efficiency
  async batchRequest(requests: Array<{ endpoint: string; options?: RequestInit }>): Promise<Response[]> {
    const batchedRequests = requests.map(({ endpoint, options }) => 
      this.request(endpoint, options)
    );

    return Promise.all(batchedRequests);
  }

  // Optimized authentication methods
  async login(email: string, password: string): Promise<AuthState> {
    const response = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error('Login failed');
    }

    const data = await response.json();
    
    // Store JWT tokens if provided
    if (data.accessToken && data.refreshToken) {
      this.tokenManager.setTokens(data.accessToken, data.refreshToken, data.expiresIn);
    }

    return {
      employee: data.user,
      permissions: data.permissions || [],
      sessionValid: true,
      lastActivity: new Date().toISOString(),
      tokenExpiry: Date.now() + (data.expiresIn * 1000),
    };
  }

  async logout(): Promise<void> {
    try {
      await this.request('/api/auth/logout', {
        method: 'POST',
      });
    } catch (error) {
      console.error('Logout request failed:', error);
    }
    
    this.tokenManager.clearTokens();
  }

  async getUser(): Promise<any> {
    const response = await this.request('/api/auth/user');
    
    if (!response.ok) {
      throw new Error('User fetch failed');
    }

    return response.json();
  }

  async getPermissions(): Promise<string[]> {
    const response = await this.request('/api/auth/permissions');
    
    if (!response.ok) {
      throw new Error('Permissions fetch failed');
    }

    const data = await response.json();
    return data.permissions || [];
  }
}

// Connection pooling for API requests
class ConnectionPool {
  private activeConnections = 0;
  private maxConnections = 10;
  private requestQueue: Array<() => Promise<any>> = [];

  async execute<T>(requestFn: () => Promise<T>): Promise<T> {
    if (this.activeConnections >= this.maxConnections) {
      return new Promise((resolve, reject) => {
        this.requestQueue.push(async () => {
          try {
            const result = await this.executeRequest(requestFn);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        });
      });
    }

    return this.executeRequest(requestFn);
  }

  private async executeRequest<T>(requestFn: () => Promise<T>): Promise<T> {
    this.activeConnections++;
    
    try {
      const result = await requestFn();
      return result;
    } finally {
      this.activeConnections--;
      this.processQueue();
    }
  }

  private processQueue(): void {
    if (this.requestQueue.length > 0 && this.activeConnections < this.maxConnections) {
      const nextRequest = this.requestQueue.shift();
      if (nextRequest) {
        nextRequest();
      }
    }
  }

  getStats(): any {
    return {
      activeConnections: this.activeConnections,
      queuedRequests: this.requestQueue.length,
      maxConnections: this.maxConnections,
    };
  }
}

// Enhanced authentication context with caching
class AuthContext {
  private authClient: AuthAPIClient;
  private connectionPool: ConnectionPool;
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  constructor() {
    this.authClient = new AuthAPIClient();
    this.connectionPool = new ConnectionPool();
  }

  async login(email: string, password: string): Promise<AuthState> {
    return this.connectionPool.execute(async () => {
      const authState = await this.authClient.login(email, password);
      
      // Cache user data
      this.cache.set('user', {
        data: authState.employee,
        timestamp: Date.now(),
        ttl: queryConfigs.auth.staleTime,
      });

      // Cache permissions
      this.cache.set('permissions', {
        data: authState.permissions,
        timestamp: Date.now(),
        ttl: queryConfigs.permissions.staleTime,
      });

      return authState;
    });
  }

  async logout(): Promise<void> {
    return this.connectionPool.execute(async () => {
      await this.authClient.logout();
      this.cache.clear();
    });
  }

  async getUser(): Promise<any> {
    const cached = this.getCachedData('user');
    if (cached) {
      return cached;
    }

    return this.connectionPool.execute(async () => {
      const user = await this.authClient.getUser();
      
      this.cache.set('user', {
        data: user,
        timestamp: Date.now(),
        ttl: queryConfigs.auth.staleTime,
      });

      return user;
    });
  }

  async getPermissions(): Promise<string[]> {
    const cached = this.getCachedData('permissions');
    if (cached) {
      return cached;
    }

    return this.connectionPool.execute(async () => {
      const permissions = await this.authClient.getPermissions();
      
      this.cache.set('permissions', {
        data: permissions,
        timestamp: Date.now(),
        ttl: queryConfigs.permissions.staleTime,
      });

      return permissions;
    });
  }

  private getCachedData(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  getStats(): any {
    return {
      ...this.connectionPool.getStats(),
      cacheSize: this.cache.size,
    };
  }
}

// Singleton instance
export const authContext = new AuthContext();

// Enhanced authentication hooks
export const useOptimizedCrmAuth = () => {
  // Implementation will be added to existing auth context
  return {
    login: authContext.login.bind(authContext),
    logout: authContext.logout.bind(authContext),
    getUser: authContext.getUser.bind(authContext),
    getPermissions: authContext.getPermissions.bind(authContext),
    getStats: authContext.getStats.bind(authContext),
  };
};

// Session monitoring and automatic refresh
export function initializeAuthOptimization(): void {
  const tokenManager = TokenManager.getInstance();
  
  // Check for existing tokens on initialization
  const storedExpiry = localStorage.getItem('crm_token_expiry');
  if (storedExpiry) {
    const expiry = parseInt(storedExpiry);
    if (Date.now() < expiry) {
      tokenManager['tokenExpiry'] = expiry;
    }
  }

  // Set up automatic token refresh
  setInterval(async () => {
    if (tokenManager.getRefreshToken() && !tokenManager.isTokenValid()) {
      try {
        await tokenManager.refreshAccessToken();
        console.log('🔄 Token refreshed automatically');
      } catch (error) {
        console.error('❌ Automatic token refresh failed:', error);
      }
    }
  }, 60000); // Check every minute

  // Monitor authentication performance
  setInterval(() => {
    const stats = authContext.getStats();
    console.log('🔐 Auth Performance Stats:', stats);
  }, 300000); // Log every 5 minutes
}

// Initialize on module load
initializeAuthOptimization();

export default {
  authContext,
  useOptimizedCrmAuth,
  initializeAuthOptimization,
};