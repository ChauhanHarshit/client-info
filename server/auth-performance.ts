/**
 * Authentication Performance Optimization System
 * Provides comprehensive performance enhancements for login systems
 */

import { LRUCache } from 'lru-cache';
import { performance } from 'perf_hooks';

// Performance Configuration
const PERFORMANCE_CONFIG = {
  // Caching settings
  USER_CACHE_SIZE: 1000,
  USER_CACHE_TTL: 5 * 60 * 1000, // 5 minutes
  AUTH_RESULT_CACHE_SIZE: 500,
  AUTH_RESULT_CACHE_TTL: 2 * 60 * 1000, // 2 minutes
  
  // Database optimization
  CONNECTION_POOL_SIZE: 10,
  QUERY_TIMEOUT: 5000, // 5 seconds
  
  // Performance monitoring
  SLOW_QUERY_THRESHOLD: 1000, // 1 second
  SLOW_AUTH_THRESHOLD: 2000, // 2 seconds
  
  // Background processing
  CLEANUP_INTERVAL: 60 * 1000, // 1 minute
  METRICS_AGGREGATION_INTERVAL: 30 * 1000, // 30 seconds
};

// User Data Cache Manager
export class UserCacheManager {
  private static instance: UserCacheManager;
  private userCache: LRUCache<string, any>;
  private authResultCache: LRUCache<string, any>;

  constructor() {
    this.userCache = new LRUCache({
      max: PERFORMANCE_CONFIG.USER_CACHE_SIZE,
      ttl: PERFORMANCE_CONFIG.USER_CACHE_TTL,
      updateAgeOnGet: true
    });

    this.authResultCache = new LRUCache({
      max: PERFORMANCE_CONFIG.AUTH_RESULT_CACHE_SIZE,
      ttl: PERFORMANCE_CONFIG.AUTH_RESULT_CACHE_TTL,
      updateAgeOnGet: false
    });
  }

  static getInstance(): UserCacheManager {
    if (!UserCacheManager.instance) {
      UserCacheManager.instance = new UserCacheManager();
    }
    return UserCacheManager.instance;
  }

  // Cache user data
  cacheUser(identifier: string, userData: any): void {
    const cacheKey = `user:${identifier}`;
    this.userCache.set(cacheKey, {
      ...userData,
      cachedAt: Date.now()
    });
  }

  // Get cached user data
  getCachedUser(identifier: string): any | null {
    const cacheKey = `user:${identifier}`;
    return this.userCache.get(cacheKey) || null;
  }

  // Cache authentication result
  cacheAuthResult(identifier: string, password: string, result: any): void {
    const cacheKey = `auth:${identifier}:${this.hashPassword(password)}`;
    this.authResultCache.set(cacheKey, {
      ...result,
      cachedAt: Date.now()
    });
  }

  // Get cached authentication result
  getCachedAuthResult(identifier: string, password: string): any | null {
    const cacheKey = `auth:${identifier}:${this.hashPassword(password)}`;
    return this.authResultCache.get(cacheKey) || null;
  }

  // Clear user cache
  clearUserCache(identifier: string): void {
    const cacheKey = `user:${identifier}`;
    this.userCache.delete(cacheKey);
    
    // Clear related auth results
    for (const key of this.authResultCache.keys()) {
      if (key.startsWith(`auth:${identifier}:`)) {
        this.authResultCache.delete(key);
      }
    }
  }

  // Clear all caches
  clearAllCaches(): void {
    this.userCache.clear();
    this.authResultCache.clear();
  }

  // Get cache statistics
  getCacheStats(): any {
    return {
      userCache: {
        size: this.userCache.size,
        calculatedSize: this.userCache.calculatedSize,
        hits: this.userCache.hits,
        misses: this.userCache.misses
      },
      authResultCache: {
        size: this.authResultCache.size,
        calculatedSize: this.authResultCache.calculatedSize,
        hits: this.authResultCache.hits,
        misses: this.authResultCache.misses
      }
    };
  }

  // Hash password for cache key (not for storage)
  private hashPassword(password: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(password).digest('hex').substring(0, 16);
  }
}

// Performance Metrics Collector
export class AuthPerformanceMetrics {
  private static instance: AuthPerformanceMetrics;
  private metrics: {
    loginAttempts: number;
    successfulLogins: number;
    failedLogins: number;
    averageResponseTime: number;
    slowQueries: number;
    cacheHits: number;
    cacheMisses: number;
    concurrentSessions: number;
    peakConcurrentSessions: number;
  };
  private responseTimes: number[] = [];
  private slowQueries: Array<{ query: string; duration: number; timestamp: number }> = [];

  constructor() {
    this.metrics = {
      loginAttempts: 0,
      successfulLogins: 0,
      failedLogins: 0,
      averageResponseTime: 0,
      slowQueries: 0,
      cacheHits: 0,
      cacheMisses: 0,
      concurrentSessions: 0,
      peakConcurrentSessions: 0
    };

    // Start metrics aggregation
    setInterval(() => {
      this.aggregateMetrics();
    }, PERFORMANCE_CONFIG.METRICS_AGGREGATION_INTERVAL);
  }

  static getInstance(): AuthPerformanceMetrics {
    if (!AuthPerformanceMetrics.instance) {
      AuthPerformanceMetrics.instance = new AuthPerformanceMetrics();
    }
    return AuthPerformanceMetrics.instance;
  }

  // Record login attempt
  recordLoginAttempt(success: boolean, responseTime: number): void {
    this.metrics.loginAttempts++;
    
    if (success) {
      this.metrics.successfulLogins++;
    } else {
      this.metrics.failedLogins++;
    }

    this.responseTimes.push(responseTime);
    
    // Keep only last 100 response times
    if (this.responseTimes.length > 100) {
      this.responseTimes = this.responseTimes.slice(-100);
    }

    // Log slow authentication
    if (responseTime > PERFORMANCE_CONFIG.SLOW_AUTH_THRESHOLD) {
      console.warn(`⚠️ Slow authentication: ${responseTime}ms`);
    }
  }

  // Record slow query
  recordSlowQuery(query: string, duration: number): void {
    this.metrics.slowQueries++;
    this.slowQueries.push({
      query: query.substring(0, 100), // Truncate long queries
      duration,
      timestamp: Date.now()
    });

    // Keep only last 50 slow queries
    if (this.slowQueries.length > 50) {
      this.slowQueries = this.slowQueries.slice(-50);
    }

    console.warn(`🐌 Slow query: ${duration}ms - ${query.substring(0, 100)}`);
  }

  // Record cache hit/miss
  recordCacheHit(hit: boolean): void {
    if (hit) {
      this.metrics.cacheHits++;
    } else {
      this.metrics.cacheMisses++;
    }
  }

  // Update concurrent sessions
  updateConcurrentSessions(count: number): void {
    this.metrics.concurrentSessions = count;
    if (count > this.metrics.peakConcurrentSessions) {
      this.metrics.peakConcurrentSessions = count;
    }
  }

  // Get current metrics
  getMetrics(): any {
    return {
      ...this.metrics,
      cacheHitRate: this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses) * 100,
      successRate: this.metrics.successfulLogins / this.metrics.loginAttempts * 100,
      recentSlowQueries: this.slowQueries.slice(-10)
    };
  }

  // Aggregate metrics
  private aggregateMetrics(): void {
    if (this.responseTimes.length > 0) {
      this.metrics.averageResponseTime = 
        this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length;
    }
  }
}

// Database Query Optimizer
export class DatabaseQueryOptimizer {
  private static instance: DatabaseQueryOptimizer;
  private queryCache: LRUCache<string, any>;
  private queryStats: Map<string, { count: number; totalTime: number; avgTime: number }>;

  constructor() {
    this.queryCache = new LRUCache({
      max: 100,
      ttl: 30 * 1000, // 30 seconds for query results
      updateAgeOnGet: false
    });

    this.queryStats = new Map();
  }

  static getInstance(): DatabaseQueryOptimizer {
    if (!DatabaseQueryOptimizer.instance) {
      DatabaseQueryOptimizer.instance = new DatabaseQueryOptimizer();
    }
    return DatabaseQueryOptimizer.instance;
  }

  // Execute optimized query
  async executeQuery(queryDb: any, query: string, params: any[]): Promise<any> {
    const startTime = performance.now();
    const cacheKey = `${query}:${JSON.stringify(params)}`;
    
    // Check cache first
    const cached = this.queryCache.get(cacheKey);
    if (cached) {
      authPerformanceMetrics.recordCacheHit(true);
      return cached;
    }

    authPerformanceMetrics.recordCacheHit(false);

    try {
      const result = await queryDb(query, params);
      const duration = performance.now() - startTime;

      // Update query statistics
      this.updateQueryStats(query, duration);

      // Cache result for SELECT queries
      if (query.trim().toLowerCase().startsWith('select')) {
        this.queryCache.set(cacheKey, result);
      }

      // Log slow queries
      if (duration > PERFORMANCE_CONFIG.SLOW_QUERY_THRESHOLD) {
        authPerformanceMetrics.recordSlowQuery(query, duration);
      }

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.updateQueryStats(query, duration);
      throw error;
    }
  }

  // Update query statistics
  private updateQueryStats(query: string, duration: number): void {
    const queryType = query.trim().split(' ')[0].toLowerCase();
    const stats = this.queryStats.get(queryType) || { count: 0, totalTime: 0, avgTime: 0 };
    
    stats.count++;
    stats.totalTime += duration;
    stats.avgTime = stats.totalTime / stats.count;
    
    this.queryStats.set(queryType, stats);
  }

  // Get query statistics
  getQueryStats(): any {
    const stats: any = {};
    for (const [type, data] of this.queryStats.entries()) {
      stats[type] = data;
    }
    return stats;
  }

  // Clear query cache
  clearQueryCache(): void {
    this.queryCache.clear();
  }
}

// Session Performance Manager
export class SessionPerformanceManager {
  private static instance: SessionPerformanceManager;
  private activeSessions: Map<string, { userId: string; createdAt: number; lastActivity: number }>;
  private sessionCleanupInterval: NodeJS.Timeout;

  constructor() {
    this.activeSessions = new Map();
    
    // Start session cleanup
    this.sessionCleanupInterval = setInterval(() => {
      this.cleanupInactiveSessions();
    }, PERFORMANCE_CONFIG.CLEANUP_INTERVAL);
  }

  static getInstance(): SessionPerformanceManager {
    if (!SessionPerformanceManager.instance) {
      SessionPerformanceManager.instance = new SessionPerformanceManager();
    }
    return SessionPerformanceManager.instance;
  }

  // Track active session
  trackSession(sessionId: string, userId: string): void {
    const now = Date.now();
    this.activeSessions.set(sessionId, {
      userId,
      createdAt: now,
      lastActivity: now
    });

    authPerformanceMetrics.updateConcurrentSessions(this.activeSessions.size);
  }

  // Update session activity
  updateSessionActivity(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.lastActivity = Date.now();
    }
  }

  // Remove session
  removeSession(sessionId: string): void {
    this.activeSessions.delete(sessionId);
    authPerformanceMetrics.updateConcurrentSessions(this.activeSessions.size);
  }

  // Get session statistics
  getSessionStats(): any {
    const now = Date.now();
    const sessions = Array.from(this.activeSessions.values());
    
    return {
      totalSessions: sessions.length,
      averageSessionDuration: sessions.length > 0 ? 
        sessions.reduce((sum, s) => sum + (now - s.createdAt), 0) / sessions.length : 0,
      activeInLastHour: sessions.filter(s => now - s.lastActivity < 60 * 60 * 1000).length,
      oldestSession: sessions.length > 0 ? Math.min(...sessions.map(s => s.createdAt)) : null
    };
  }

  // Cleanup inactive sessions
  private cleanupInactiveSessions(): void {
    const now = Date.now();
    const inactiveThreshold = 24 * 60 * 60 * 1000; // 24 hours
    
    let cleaned = 0;
    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (now - session.lastActivity > inactiveThreshold) {
        this.activeSessions.delete(sessionId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} inactive sessions`);
      authPerformanceMetrics.updateConcurrentSessions(this.activeSessions.size);
    }
  }
}

// Export performance instances
export const userCache = UserCacheManager.getInstance();
export const authPerformanceMetrics = AuthPerformanceMetrics.getInstance();
export const queryOptimizer = DatabaseQueryOptimizer.getInstance();
export const sessionPerformanceManager = SessionPerformanceManager.getInstance();

// Export performance configuration
export { PERFORMANCE_CONFIG };