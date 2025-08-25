/**
 * Routing Optimization Hook
 * 
 * Integrates routing performance optimizations into existing creator routes
 * without changing site logic, functions, databases, or layouts
 */

import { useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { 
  useOptimizedNavigation, 
  useRoutePerformanceTracking,
  RoutePreloader 
} from '@/lib/routing-optimization';
import { 
  useCreatorDataSync, 
  useRouteDataPrefetching 
} from '@/lib/data-sync-optimization';
import { 
  useComponentPerformanceTracking 
} from '@/lib/component-optimization';

/**
 * Main routing optimization hook for creator routes
 */
export function useRoutingOptimization(options?: {
  creatorId?: string | number;
  enablePrefetching?: boolean;
  enablePerformanceTracking?: boolean;
}) {
  const { 
    creatorId, 
    enablePrefetching = true, 
    enablePerformanceTracking = true 
  } = options || {};
  
  const [location] = useLocation();
  const queryClient = useQueryClient();
  const preloader = RoutePreloader.getInstance();
  
  // Initialize routing optimizations
  const { navigateTo, navigateToCreator } = useOptimizedNavigation();
  const { prefetchOnHover, prefetchCreatorRoute } = useRouteDataPrefetching();
  const { getRouteStats } = useRoutePerformanceTracking();
  
  // Initialize data synchronization
  const { syncedData, syncCreatorData, syncCustomsData } = useCreatorDataSync(creatorId);
  
  // Initialize component performance tracking
  const { trackError } = useComponentPerformanceTracking(`Route_${location}`);
  
  // Preload common routes on mount
  useEffect(() => {
    if (enablePrefetching) {
      const commonRoutes = [
        '/customs-dashboard',
        '/customs-team-links',
        '/creator-app-layout',
      ];
      
      commonRoutes.forEach(route => {
        preloader.queueRoutePreload(route);
      });
    }
  }, [enablePrefetching, preloader]);
  
  // Prefetch creator data when creator ID changes
  useEffect(() => {
    if (enablePrefetching && creatorId) {
      prefetchCreatorRoute(creatorId, location);
    }
  }, [creatorId, location, enablePrefetching, prefetchCreatorRoute]);
  
  // Optimized navigation function
  const optimizedNavigate = useCallback((route: string, options?: { creatorId?: string | number }) => {
    const { creatorId: navCreatorId } = options || {};
    
    try {
      navigateTo(route, {
        preloadData: enablePrefetching,
        creatorId: navCreatorId || creatorId,
      });
    } catch (error) {
      if (enablePerformanceTracking) {
        trackError(error as Error);
      }
      // Fallback to regular navigation
      window.location.href = route;
    }
  }, [navigateTo, creatorId, enablePrefetching, enablePerformanceTracking, trackError]);
  
  // Creator-specific navigation
  const navigateToCreatorRoute = useCallback((targetCreatorId: string | number, route: 'customs-team-links' | 'app-layout') => {
    try {
      navigateToCreator(targetCreatorId, route);
    } catch (error) {
      if (enablePerformanceTracking) {
        trackError(error as Error);
      }
      // Fallback navigation
      const routeMap = {
        'customs-team-links': '/customs-team-links',
        'app-layout': '/creator-app-layout',
      };
      window.location.href = routeMap[route];
    }
  }, [navigateToCreator, enablePerformanceTracking, trackError]);
  
  // Data sync utilities
  const syncData = useCallback((data: any, type: 'creator' | 'customs' | 'team-links') => {
    if (!creatorId) return;
    
    try {
      switch (type) {
        case 'creator':
          syncCreatorData(data, creatorId);
          break;
        case 'customs':
          syncCustomsData(data, creatorId);
          break;
        case 'team-links':
          // Sync team links data
          queryClient.setQueryData(['/api/team-link-tokens'], (oldData: any) => {
            if (Array.isArray(oldData)) {
              return oldData.map(link => 
                link.creatorId === creatorId ? { ...link, ...data } : link
              );
            }
            return oldData;
          });
          break;
      }
    } catch (error) {
      if (enablePerformanceTracking) {
        trackError(error as Error);
      }
    }
  }, [creatorId, syncCreatorData, syncCustomsData, queryClient, enablePerformanceTracking, trackError]);
  
  // Performance stats
  const getPerformanceStats = useCallback(() => {
    return enablePerformanceTracking ? getRouteStats(location) : null;
  }, [enablePerformanceTracking, getRouteStats, location]);
  
  // Hover prefetch utilities
  const createHoverPrefetch = useCallback((targetCreatorId: string | number, targetRoute: string) => {
    return enablePrefetching ? prefetchOnHover(targetCreatorId, targetRoute) : {};
  }, [enablePrefetching, prefetchOnHover]);
  
  return {
    // Navigation utilities
    optimizedNavigate,
    navigateToCreatorRoute,
    
    // Data synchronization
    syncedData,
    syncData,
    
    // Performance utilities
    getPerformanceStats,
    createHoverPrefetch,
    
    // Current route info
    currentRoute: location,
    
    // Status flags
    isPrefetchingEnabled: enablePrefetching,
    isPerformanceTrackingEnabled: enablePerformanceTracking,
  };
}

/**
 * Creator-specific routing optimization hook
 */
export function useCreatorRoutingOptimization(creatorId: string | number) {
  return useRoutingOptimization({
    creatorId,
    enablePrefetching: true,
    enablePerformanceTracking: true,
  });
}

/**
 * Simple routing optimization hook (no creator-specific features)
 */
export function useSimpleRoutingOptimization() {
  return useRoutingOptimization({
    enablePrefetching: true,
    enablePerformanceTracking: true,
  });
}