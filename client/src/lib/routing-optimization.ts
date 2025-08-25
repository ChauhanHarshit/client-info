/**
 * Routing Performance Optimization System
 * 
 * Comprehensive routing optimizations for improved navigation speed and efficiency
 * between /customs-team-links, /creator-app-layout, and /customs-dashboard routes
 * with proper creator synchronization.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';

// Route preloading cache
const routePreloadCache = new Map<string, Promise<any>>();
const componentCache = new Map<string, React.ComponentType<any>>();

/**
 * Route Preloading System
 * Preloads route components and data during idle time
 */
export class RoutePreloader {
  private static instance: RoutePreloader;
  private preloadQueue: string[] = [];
  private isPreloading = false;

  static getInstance(): RoutePreloader {
    if (!RoutePreloader.instance) {
      RoutePreloader.instance = new RoutePreloader();
    }
    return RoutePreloader.instance;
  }

  /**
   * Add route to preload queue
   */
  queueRoutePreload(route: string): void {
    if (!this.preloadQueue.includes(route)) {
      this.preloadQueue.push(route);
      this.processPreloadQueue();
    }
  }

  /**
   * Process preload queue during idle time
   */
  private async processPreloadQueue(): Promise<void> {
    if (this.isPreloading || this.preloadQueue.length === 0) return;

    this.isPreloading = true;

    // Use requestIdleCallback for better performance
    const processNext = () => {
      if (this.preloadQueue.length > 0) {
        const route = this.preloadQueue.shift()!;
        this.preloadRoute(route).finally(() => {
          if (this.preloadQueue.length > 0) {
            requestIdleCallback(processNext);
          } else {
            this.isPreloading = false;
          }
        });
      } else {
        this.isPreloading = false;
      }
    };

    requestIdleCallback(processNext);
  }

  /**
   * Preload specific route component
   */
  private async preloadRoute(route: string): Promise<void> {
    try {
      if (routePreloadCache.has(route)) return;

      const preloadPromise = this.getRoutePreloader(route)();
      routePreloadCache.set(route, preloadPromise);
      await preloadPromise;
    } catch (error) {
      console.warn(`Failed to preload route ${route}:`, error);
    }
  }

  /**
   * Get route-specific preloader function
   */
  private getRoutePreloader(route: string): () => Promise<any> {
    const preloaders: Record<string, () => Promise<any>> = {
      '/customs-dashboard': () => import('../pages/customs-dashboard'),
      '/customs-team-links': () => import('../pages/customs-team-links'),
      '/creator-app-layout': () => import('../pages/creator-app-layout-exact'),
    };

    return preloaders[route] || (() => Promise.resolve());
  }

  /**
   * Clear preload cache
   */
  clearCache(): void {
    routePreloadCache.clear();
    componentCache.clear();
  }
}

/**
 * Creator Context Optimization Hook
 * Provides unified creator data management across routes
 */
export function useCreatorRouteContext() {
  const queryClient = useQueryClient();
  const [location] = useLocation();
  const [creatorData, setCreatorData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Get creator data with caching
   */
  const getCreatorData = useCallback(async (creatorId: string | number) => {
    const cacheKey = `creator_${creatorId}`;
    
    // Check cache first
    const cachedData = queryClient.getQueryData([cacheKey]);
    if (cachedData) {
      setCreatorData(cachedData);
      return cachedData;
    }

    setIsLoading(true);
    try {
      // Fetch creator data
      const response = await fetch(`/api/creators/${creatorId}`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Cache the data
        queryClient.setQueryData([cacheKey], data, {
          staleTime: 5 * 60 * 1000, // 5 minutes
        });
        
        setCreatorData(data);
        return data;
      }
    } catch (error) {
      console.error('Failed to fetch creator data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [queryClient]);

  /**
   * Invalidate creator data cache
   */
  const invalidateCreatorData = useCallback((creatorId: string | number) => {
    const cacheKey = `creator_${creatorId}`;
    queryClient.invalidateQueries({ queryKey: [cacheKey] });
  }, [queryClient]);

  return {
    creatorData,
    isLoading,
    getCreatorData,
    invalidateCreatorData,
  };
}

/**
 * Route Navigation Optimization Hook
 * Provides optimized navigation with preloading and caching
 */
export function useOptimizedNavigation() {
  const [, setLocation] = useLocation();
  const preloader = RoutePreloader.getInstance();
  const queryClient = useQueryClient();

  /**
   * Navigate with preloading and optimization
   */
  const navigateTo = useCallback((route: string, options?: {
    preloadData?: boolean;
    creatorId?: string | number;
  }) => {
    const { preloadData = true, creatorId } = options || {};

    // Preload route component
    preloader.queueRoutePreload(route);

    // Preload creator data if needed
    if (preloadData && creatorId) {
      queryClient.prefetchQuery({
        queryKey: [`creator_${creatorId}`],
        queryFn: async () => {
          const response = await fetch(`/api/creators/${creatorId}`, {
            credentials: 'include',
          });
          return response.ok ? response.json() : null;
        },
        staleTime: 5 * 60 * 1000,
      });
    }

    // Navigate
    setLocation(route);
  }, [setLocation, preloader, queryClient]);

  /**
   * Navigate to creator-specific route
   */
  const navigateToCreator = useCallback((creatorId: string | number, route: 'customs-team-links' | 'app-layout') => {
    const routeMap = {
      'customs-team-links': '/customs-team-links',
      'app-layout': '/creator-app-layout',
    };

    navigateTo(routeMap[route], {
      preloadData: true,
      creatorId,
    });
  }, [navigateTo]);

  return {
    navigateTo,
    navigateToCreator,
  };
}

/**
 * Route Performance Monitor
 * Tracks route performance and provides optimization insights
 */
export class RoutePerformanceMonitor {
  private static instance: RoutePerformanceMonitor;
  private metrics: Map<string, {
    loadTime: number;
    timestamp: number;
    route: string;
  }[]> = new Map();

  static getInstance(): RoutePerformanceMonitor {
    if (!RoutePerformanceMonitor.instance) {
      RoutePerformanceMonitor.instance = new RoutePerformanceMonitor();
    }
    return RoutePerformanceMonitor.instance;
  }

  /**
   * Track route load time
   */
  trackRouteLoad(route: string, loadTime: number): void {
    if (!this.metrics.has(route)) {
      this.metrics.set(route, []);
    }

    const routeMetrics = this.metrics.get(route)!;
    routeMetrics.push({
      loadTime,
      timestamp: Date.now(),
      route,
    });

    // Keep only last 10 measurements
    if (routeMetrics.length > 10) {
      routeMetrics.shift();
    }
  }

  /**
   * Get route performance stats
   */
  getRouteStats(route: string): {
    averageLoadTime: number;
    minLoadTime: number;
    maxLoadTime: number;
    measurementCount: number;
  } | null {
    const metrics = this.metrics.get(route);
    if (!metrics || metrics.length === 0) return null;

    const loadTimes = metrics.map(m => m.loadTime);
    return {
      averageLoadTime: loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length,
      minLoadTime: Math.min(...loadTimes),
      maxLoadTime: Math.max(...loadTimes),
      measurementCount: loadTimes.length,
    };
  }

  /**
   * Get all performance metrics
   */
  getAllStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    
    for (const [route, metrics] of this.metrics.entries()) {
      stats[route] = this.getRouteStats(route);
    }
    
    return stats;
  }
}

/**
 * Route Performance Tracking Hook
 */
export function useRoutePerformanceTracking() {
  const [location] = useLocation();
  const monitor = RoutePerformanceMonitor.getInstance();
  const startTimeRef = useRef<number>();

  useEffect(() => {
    startTimeRef.current = performance.now();
  }, [location]);

  useEffect(() => {
    return () => {
      if (startTimeRef.current) {
        const loadTime = performance.now() - startTimeRef.current;
        monitor.trackRouteLoad(location, loadTime);
      }
    };
  }, [location, monitor]);

  return {
    getRouteStats: monitor.getRouteStats.bind(monitor),
    getAllStats: monitor.getAllStats.bind(monitor),
  };
}

/**
 * Initialize routing optimizations
 */
export function initializeRoutingOptimizations(): void {
  // Initialize preloader
  const preloader = RoutePreloader.getInstance();
  
  // Initialize performance monitor
  const monitor = RoutePerformanceMonitor.getInstance();
  
  // Preload frequently accessed routes
  const commonRoutes = [
    '/customs-dashboard',
    '/customs-team-links',
    '/creator-app-layout',
  ];
  
  commonRoutes.forEach(route => {
    preloader.queueRoutePreload(route);
  });
  
  console.log('🚀 Routing optimizations initialized');
}