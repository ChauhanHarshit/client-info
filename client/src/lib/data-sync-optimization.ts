/**
 * Data Synchronization Optimization System
 * 
 * Real-time data synchronization for creator data across all CRM routes
 * ensuring instant updates between /customs-dashboard, /customs-team-links,
 * and /creator-app-layout without changing security boundaries.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';

// Global data sync event system
class DataSyncEventSystem {
  private static instance: DataSyncEventSystem;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private dataCache: Map<string, any> = new Map();

  static getInstance(): DataSyncEventSystem {
    if (!DataSyncEventSystem.instance) {
      DataSyncEventSystem.instance = new DataSyncEventSystem();
    }
    return DataSyncEventSystem.instance;
  }

  /**
   * Subscribe to data changes
   */
  subscribe(key: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    
    this.listeners.get(key)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners.get(key)?.delete(callback);
    };
  }

  /**
   * Emit data change event
   */
  emit(key: string, data: any): void {
    // Update cache
    this.dataCache.set(key, data);
    
    // Notify all listeners
    const listeners = this.listeners.get(key);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  /**
   * Get cached data
   */
  getCache(key: string): any {
    return this.dataCache.get(key);
  }

  /**
   * Clear cache
   */
  clearCache(key?: string): void {
    if (key) {
      this.dataCache.delete(key);
    } else {
      this.dataCache.clear();
    }
  }
}

/**
 * Creator Data Synchronization Hook
 * Provides real-time creator data sync across all routes
 */
export function useCreatorDataSync(creatorId?: string | number) {
  const queryClient = useQueryClient();
  const syncSystem = DataSyncEventSystem.getInstance();
  const [syncedData, setSyncedData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Sync creator data across all routes
   */
  const syncCreatorData = useCallback(async (data: any, creatorId: string | number) => {
    const syncKey = `creator_${creatorId}`;
    
    // Update React Query cache
    queryClient.setQueryData(['/api/creators', creatorId], data);
    queryClient.setQueryData(['/api/creators'], (oldData: any) => {
      if (Array.isArray(oldData)) {
        return oldData.map(creator => 
          creator.id === creatorId ? { ...creator, ...data } : creator
        );
      }
      return oldData;
    });

    // Emit sync event
    syncSystem.emit(syncKey, data);
  }, [queryClient, syncSystem]);

  /**
   * Sync customs data for creator
   */
  const syncCustomsData = useCallback(async (customsData: any, creatorId: string | number) => {
    const syncKey = `customs_${creatorId}`;
    
    // Update customs-related queries
    queryClient.setQueryData(['/api/custom-contents/admin'], (oldData: any) => {
      if (Array.isArray(oldData)) {
        return oldData.map(custom => 
          custom.clientId === creatorId ? { ...custom, ...customsData } : custom
        );
      }
      return oldData;
    });

    // Emit sync event
    syncSystem.emit(syncKey, customsData);
  }, [queryClient, syncSystem]);

  /**
   * Sync team links data for creator
   */
  const syncTeamLinksData = useCallback(async (teamLinksData: any, creatorId: string | number) => {
    const syncKey = `team_links_${creatorId}`;
    
    // Update team links queries
    queryClient.setQueryData(['/api/team-link-tokens'], (oldData: any) => {
      if (Array.isArray(oldData)) {
        return oldData.map(link => 
          link.creatorId === creatorId ? { ...link, ...teamLinksData } : link
        );
      }
      return oldData;
    });

    // Emit sync event
    syncSystem.emit(syncKey, teamLinksData);
  }, [queryClient, syncSystem]);

  /**
   * Subscribe to creator data changes
   */
  useEffect(() => {
    if (!creatorId) return;

    const syncKey = `creator_${creatorId}`;
    
    // Get cached data
    const cachedData = syncSystem.getCache(syncKey);
    if (cachedData) {
      setSyncedData(cachedData);
    }

    // Subscribe to changes
    const unsubscribe = syncSystem.subscribe(syncKey, (data) => {
      setSyncedData(data);
    });

    return unsubscribe;
  }, [creatorId, syncSystem]);

  return {
    syncedData,
    isLoading,
    syncCreatorData,
    syncCustomsData,
    syncTeamLinksData,
  };
}

/**
 * Optimistic Updates System
 * Provides optimistic updates with rollback functionality
 */
export class OptimisticUpdatesSystem {
  private static instance: OptimisticUpdatesSystem;
  private pendingUpdates: Map<string, {
    originalData: any;
    optimisticData: any;
    timestamp: number;
  }> = new Map();

  static getInstance(): OptimisticUpdatesSystem {
    if (!OptimisticUpdatesSystem.instance) {
      OptimisticUpdatesSystem.instance = new OptimisticUpdatesSystem();
    }
    return OptimisticUpdatesSystem.instance;
  }

  /**
   * Apply optimistic update
   */
  applyOptimisticUpdate(key: string, originalData: any, optimisticData: any): void {
    this.pendingUpdates.set(key, {
      originalData,
      optimisticData,
      timestamp: Date.now(),
    });
  }

  /**
   * Confirm optimistic update
   */
  confirmUpdate(key: string): void {
    this.pendingUpdates.delete(key);
  }

  /**
   * Rollback optimistic update
   */
  rollbackUpdate(key: string): any {
    const update = this.pendingUpdates.get(key);
    if (update) {
      this.pendingUpdates.delete(key);
      return update.originalData;
    }
    return null;
  }

  /**
   * Get pending updates
   */
  getPendingUpdates(): Map<string, any> {
    return new Map(this.pendingUpdates);
  }

  /**
   * Clear old updates (older than 30 seconds)
   */
  clearOldUpdates(): void {
    const now = Date.now();
    const maxAge = 30 * 1000; // 30 seconds

    for (const [key, update] of this.pendingUpdates) {
      if (now - update.timestamp > maxAge) {
        this.pendingUpdates.delete(key);
      }
    }
  }
}

/**
 * Optimistic Updates Hook
 */
export function useOptimisticUpdates() {
  const queryClient = useQueryClient();
  const optimisticSystem = OptimisticUpdatesSystem.getInstance();
  const syncSystem = DataSyncEventSystem.getInstance();

  /**
   * Apply optimistic update with automatic rollback
   */
  const applyOptimisticUpdate = useCallback(async (
    queryKey: string[],
    optimisticData: any,
    updateFn: () => Promise<any>
  ) => {
    const key = queryKey.join('_');
    const originalData = queryClient.getQueryData(queryKey);

    try {
      // Apply optimistic update
      queryClient.setQueryData(queryKey, optimisticData);
      optimisticSystem.applyOptimisticUpdate(key, originalData, optimisticData);

      // Sync across routes
      syncSystem.emit(key, optimisticData);

      // Perform actual update
      const result = await updateFn();

      // Confirm update
      optimisticSystem.confirmUpdate(key);
      queryClient.setQueryData(queryKey, result);
      syncSystem.emit(key, result);

      return result;
    } catch (error) {
      // Rollback on error
      const rolledBackData = optimisticSystem.rollbackUpdate(key);
      if (rolledBackData) {
        queryClient.setQueryData(queryKey, rolledBackData);
        syncSystem.emit(key, rolledBackData);
      }
      throw error;
    }
  }, [queryClient, optimisticSystem, syncSystem]);

  return {
    applyOptimisticUpdate,
  };
}

/**
 * Route Data Prefetching System
 * Prefetches data for route navigation
 */
export class RouteDataPrefetcher {
  private static instance: RouteDataPrefetcher;
  private prefetchQueue: Array<{
    route: string;
    queryKey: string[];
    queryFn: () => Promise<any>;
    priority: number;
  }> = [];
  private isPrefetching = false;

  static getInstance(): RouteDataPrefetcher {
    if (!RouteDataPrefetcher.instance) {
      RouteDataPrefetcher.instance = new RouteDataPrefetcher();
    }
    return RouteDataPrefetcher.instance;
  }

  /**
   * Queue data prefetch for route
   */
  queuePrefetch(
    route: string,
    queryKey: string[],
    queryFn: () => Promise<any>,
    priority: number = 1
  ): void {
    this.prefetchQueue.push({ route, queryKey, queryFn, priority });
    this.prefetchQueue.sort((a, b) => b.priority - a.priority);
    this.processPrefetchQueue();
  }

  /**
   * Process prefetch queue
   */
  private async processPrefetchQueue(): Promise<void> {
    if (this.isPrefetching || this.prefetchQueue.length === 0) return;

    this.isPrefetching = true;

    while (this.prefetchQueue.length > 0) {
      const { route, queryKey, queryFn } = this.prefetchQueue.shift()!;

      try {
        const data = await queryFn();
        
        // Cache the prefetched data
        const syncSystem = DataSyncEventSystem.getInstance();
        syncSystem.emit(queryKey.join('_'), data);
      } catch (error) {
        console.warn(`Failed to prefetch data for route ${route}:`, error);
      }

      // Yield control to prevent blocking
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    this.isPrefetching = false;
  }

  /**
   * Prefetch creator data for route
   */
  prefetchCreatorData(creatorId: string | number, route: string): void {
    this.queuePrefetch(
      route,
      ['creator', creatorId.toString()],
      async () => {
        const response = await fetch(`/api/creators/${creatorId}`, {
          credentials: 'include',
        });
        return response.ok ? response.json() : null;
      },
      2
    );
  }

  /**
   * Prefetch customs data for route
   */
  prefetchCustomsData(creatorId: string | number, route: string): void {
    this.queuePrefetch(
      route,
      ['customs', creatorId.toString()],
      async () => {
        const response = await fetch(`/api/custom-contents/admin?clientId=${creatorId}`, {
          credentials: 'include',
        });
        return response.ok ? response.json() : null;
      },
      2
    );
  }
}

/**
 * Route Data Prefetching Hook
 */
export function useRouteDataPrefetching() {
  const [location] = useLocation();
  const prefetcher = RouteDataPrefetcher.getInstance();

  /**
   * Prefetch data for creator route
   */
  const prefetchCreatorRoute = useCallback((creatorId: string | number, targetRoute: string) => {
    prefetcher.prefetchCreatorData(creatorId, targetRoute);
    prefetcher.prefetchCustomsData(creatorId, targetRoute);
  }, [prefetcher]);

  /**
   * Prefetch data on hover
   */
  const prefetchOnHover = useCallback((creatorId: string | number, targetRoute: string) => {
    return {
      onMouseEnter: () => prefetchCreatorRoute(creatorId, targetRoute),
    };
  }, [prefetchCreatorRoute]);

  return {
    prefetchCreatorRoute,
    prefetchOnHover,
  };
}

/**
 * Data Sync Performance Monitor
 */
export class DataSyncPerformanceMonitor {
  private static instance: DataSyncPerformanceMonitor;
  private syncMetrics: Map<string, number[]> = new Map();

  static getInstance(): DataSyncPerformanceMonitor {
    if (!DataSyncPerformanceMonitor.instance) {
      DataSyncPerformanceMonitor.instance = new DataSyncPerformanceMonitor();
    }
    return DataSyncPerformanceMonitor.instance;
  }

  /**
   * Track sync performance
   */
  trackSync(key: string, duration: number): void {
    if (!this.syncMetrics.has(key)) {
      this.syncMetrics.set(key, []);
    }

    const metrics = this.syncMetrics.get(key)!;
    metrics.push(duration);

    // Keep only last 20 measurements
    if (metrics.length > 20) {
      metrics.shift();
    }
  }

  /**
   * Get sync performance stats
   */
  getSyncStats(): Record<string, {
    averageSync: number;
    minSync: number;
    maxSync: number;
    syncCount: number;
  }> {
    const stats: Record<string, any> = {};

    for (const [key, metrics] of this.syncMetrics) {
      if (metrics.length > 0) {
        stats[key] = {
          averageSync: metrics.reduce((a, b) => a + b, 0) / metrics.length,
          minSync: Math.min(...metrics),
          maxSync: Math.max(...metrics),
          syncCount: metrics.length,
        };
      }
    }

    return stats;
  }
}

/**
 * Initialize data synchronization system
 */
export function initializeDataSyncOptimizations(): void {
  const syncSystem = DataSyncEventSystem.getInstance();
  const optimisticSystem = OptimisticUpdatesSystem.getInstance();
  const prefetcher = RouteDataPrefetcher.getInstance();
  const monitor = DataSyncPerformanceMonitor.getInstance();

  // Clean up old optimistic updates periodically
  setInterval(() => {
    optimisticSystem.clearOldUpdates();
  }, 30000); // Every 30 seconds

  console.log('🔄 Data synchronization optimizations initialized');
}