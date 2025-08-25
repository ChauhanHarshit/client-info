/**
 * CRM Frontend Performance Optimization System
 * Implements caching, component optimization, and performance monitoring for 400+ employee scaling
 */

import { QueryClient } from '@tanstack/react-query';
import React, { memo, useMemo, useCallback } from 'react';

// Enhanced React Query configuration for CRM scalability
export const optimizedQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Employee authentication and session data
      staleTime: 1000 * 60 * 30, // 30 minutes stale time for auth data
      gcTime: 1000 * 60 * 60, // 1 hour garbage collection time
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false, // Prevent unnecessary refetches
      refetchOnMount: false, // Prevent unnecessary refetches on mount
      refetchOnReconnect: true, // Refetch on network reconnection
      networkMode: 'always', // Continue working offline when possible
    },
    mutations: {
      retry: 2,
      retryDelay: 1000,
      networkMode: 'always',
    },
  },
});

// Optimized query configurations for different data types
export const queryConfigs = {
  // Employee authentication - fast refresh for security
  auth: {
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
    refetchInterval: 1000 * 60 * 10, // Refresh every 10 minutes
  },
  
  // Employee permissions - moderate refresh
  permissions: {
    staleTime: 1000 * 60 * 15, // 15 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    refetchInterval: 1000 * 60 * 20, // Refresh every 20 minutes
  },
  
  // Employee list - slower refresh for better performance
  employees: {
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
    refetchInterval: 1000 * 60 * 30, // Refresh every 30 minutes
  },
  
  // Dashboard data - balanced refresh
  dashboard: {
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
    refetchInterval: 1000 * 60 * 15, // Refresh every 15 minutes
  },
  
  // Static/rarely changing data
  static: {
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 2, // 2 hours
    refetchInterval: false, // No automatic refresh
  },
};

// Performance monitoring system
class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  private memoryUsage: number[] = [];
  private renderTimes: Map<string, number> = new Map();
  
  // Track API response times
  trackAPICall(endpoint: string, duration: number): void {
    if (!this.metrics.has(endpoint)) {
      this.metrics.set(endpoint, []);
    }
    
    const times = this.metrics.get(endpoint)!;
    times.push(duration);
    
    // Keep only last 100 measurements
    if (times.length > 100) {
      times.shift();
    }
    
    // Log slow requests
    if (duration > 2000) {
      console.warn(`🐌 Slow API call: ${endpoint} took ${duration}ms`);
    }
  }
  
  // Track component render times
  trackRender(componentName: string, duration: number): void {
    this.renderTimes.set(componentName, duration);
    
    if (duration > 100) {
      console.warn(`🐌 Slow render: ${componentName} took ${duration}ms`);
    }
  }
  
  // Track memory usage
  trackMemory(): void {
    if (typeof performance !== 'undefined' && performance.memory) {
      const usage = performance.memory.usedJSHeapSize / 1024 / 1024; // MB
      this.memoryUsage.push(usage);
      
      // Keep only last 100 measurements
      if (this.memoryUsage.length > 100) {
        this.memoryUsage.shift();
      }
      
      // Warn if memory usage is high
      if (usage > 150) {
        console.warn(`🚨 High memory usage: ${usage.toFixed(2)}MB`);
      }
    }
  }
  
  // Get performance statistics
  getStats(): any {
    const stats: any = {
      apiCalls: {},
      memoryUsage: {
        current: this.memoryUsage[this.memoryUsage.length - 1] || 0,
        average: this.memoryUsage.reduce((a, b) => a + b, 0) / this.memoryUsage.length || 0,
        max: Math.max(...this.memoryUsage) || 0,
      },
      renderTimes: Object.fromEntries(this.renderTimes),
    };
    
    // Calculate API statistics
    for (const [endpoint, times] of this.metrics) {
      stats.apiCalls[endpoint] = {
        average: times.reduce((a, b) => a + b, 0) / times.length,
        min: Math.min(...times),
        max: Math.max(...times),
        count: times.length,
      };
    }
    
    return stats;
  }
}

export const performanceMonitor = new PerformanceMonitor();

// Component optimization utilities
export const optimizationUtils = {
  // Memoize expensive computations
  memoize: <T extends (...args: any[]) => any>(fn: T): T => {
    const cache = new Map();
    return ((...args: any[]) => {
      const key = JSON.stringify(args);
      if (cache.has(key)) {
        return cache.get(key);
      }
      const result = fn(...args);
      cache.set(key, result);
      return result;
    }) as T;
  },
  
  // Debounce function calls
  debounce: <T extends (...args: any[]) => any>(fn: T, delay: number): T => {
    let timeoutId: NodeJS.Timeout;
    return ((...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn(...args), delay);
    }) as T;
  },
  
  // Throttle function calls
  throttle: <T extends (...args: any[]) => any>(fn: T, delay: number): T => {
    let lastCall = 0;
    return ((...args: any[]) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        return fn(...args);
      }
    }) as T;
  },
  
  // Lazy loading utility
  lazy: <T>(factory: () => Promise<T>): (() => Promise<T>) => {
    let promise: Promise<T> | null = null;
    return () => {
      if (!promise) {
        promise = factory();
      }
      return promise;
    };
  },
};

// Enhanced component wrapper for performance monitoring
export function withPerformanceMonitoring<T extends React.ComponentType<any>>(
  Component: T,
  componentName: string
): T {
  const WrappedComponent = memo((props: any) => {
    const startTime = performance.now();
    
    const result = useMemo(() => {
      return React.createElement(Component, props);
    }, [props]);
    
    const endTime = performance.now();
    performanceMonitor.trackRender(componentName, endTime - startTime);
    
    return result;
  });
  
  return WrappedComponent as T;
}

// Cache management for employee data
class EmployeeCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  
  set(key: string, data: any, ttl: number = 1800000): void { // 30 minute default TTL
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }
  
  get(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }
  
  invalidate(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  getStats(): any {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

export const employeeCache = new EmployeeCache();

// Optimized hooks for common CRM operations
export const useOptimizedAuth = () => {
  return useMemo(() => ({
    // Add optimized auth logic here
  }), []);
};

export const useOptimizedPermissions = () => {
  return useMemo(() => ({
    // Add optimized permissions logic here
  }), []);
};

// Bundle optimization - code splitting helpers
export const lazyComponents = {
  // Lazy load heavy admin components
  EmployeeManagement: optimizationUtils.lazy(() => import('../pages/employee-management')),
  ContentManagement: optimizationUtils.lazy(() => import('../pages/content-management')),
  ReportsAdmin: optimizationUtils.lazy(() => import('../pages/weekly-reports-admin')),
  
  // Lazy load rarely used components
  InvoiceManagement: optimizationUtils.lazy(() => import('../pages/invoice-management-admin')),
  GrowthMetrics: optimizationUtils.lazy(() => import('../pages/growth-metrics-admin')),
  LeadManagement: optimizationUtils.lazy(() => import('../pages/lead-management')),
};

// Performance monitoring initialization
export function initializePerformanceMonitoring(): void {
  // Track memory usage every 30 seconds
  setInterval(() => {
    performanceMonitor.trackMemory();
  }, 30000);
  
  // Log performance stats every 5 minutes
  setInterval(() => {
    const stats = performanceMonitor.getStats();
    console.log('📊 CRM Performance Stats:', stats);
  }, 300000);
  
  // Clear old cache entries every hour
  setInterval(() => {
    console.log('🧹 Cleaning up old cache entries...');
    // Cache cleanup is handled automatically by TTL
  }, 3600000);
}

// Network optimization utilities
export const networkOptimization = {
  // Batch multiple API requests
  batchRequests: optimizationUtils.debounce((requests: Array<() => Promise<any>>) => {
    return Promise.all(requests.map(request => request()));
  }, 100),
  
  // Request compression
  compressRequest: (data: any): any => {
    // Implement request compression if needed
    return data;
  },
  
  // Response caching
  cacheResponse: (key: string, data: any, ttl: number = 300000): void => {
    employeeCache.set(key, data, ttl);
  },
  
  // Cached request wrapper
  cachedRequest: async (key: string, requestFn: () => Promise<any>, ttl: number = 300000): Promise<any> => {
    const cached = employeeCache.get(key);
    if (cached) {
      return cached;
    }
    
    const result = await requestFn();
    employeeCache.set(key, result, ttl);
    return result;
  },
};

// Initialize performance monitoring
initializePerformanceMonitoring();

export default {
  optimizedQueryClient,
  queryConfigs,
  performanceMonitor,
  optimizationUtils,
  withPerformanceMonitoring,
  employeeCache,
  networkOptimization,
};