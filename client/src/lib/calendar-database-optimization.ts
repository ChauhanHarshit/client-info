/**
 * Calendar Database Optimization System
 * Implements database query optimization, caching, and connection management
 * Category 1: Database Query Optimization
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useEffect } from 'react';

// Database Query Optimizer
class CalendarDatabaseOptimizer {
  private static instance: CalendarDatabaseOptimizer;
  private queryCache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private queryStats = new Map<string, { count: number; avgTime: number; errors: number }>();
  private connectionPool = new Map<string, number>();
  private maxConnections = 10;
  private queryTimeout = 5000; // 5 seconds

  static getInstance(): CalendarDatabaseOptimizer {
    if (!CalendarDatabaseOptimizer.instance) {
      CalendarDatabaseOptimizer.instance = new CalendarDatabaseOptimizer();
    }
    return CalendarDatabaseOptimizer.instance;
  }

  // Optimize query with caching and connection pooling
  async optimizeQuery(
    queryKey: string,
    queryFn: () => Promise<any>,
    options: { ttl?: number; timeout?: number } = {}
  ): Promise<any> {
    const { ttl = 5 * 60 * 1000, timeout = this.queryTimeout } = options;
    
    // Check cache first
    const cached = this.queryCache.get(queryKey);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      this.recordQueryStats(queryKey, 0, false); // Cache hit
      return cached.data;
    }

    // Check connection pool
    const activeConnections = this.connectionPool.get(queryKey) || 0;
    if (activeConnections >= this.maxConnections) {
      throw new Error('Connection pool exhausted');
    }

    try {
      // Track connection
      this.connectionPool.set(queryKey, activeConnections + 1);
      
      const startTime = performance.now();
      
      // Execute query with timeout
      const result = await Promise.race([
        queryFn(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Query timeout')), timeout)
        )
      ]);
      
      const queryTime = performance.now() - startTime;
      
      // Cache result
      this.queryCache.set(queryKey, {
        data: result,
        timestamp: Date.now(),
        ttl
      });
      
      // Record stats
      this.recordQueryStats(queryKey, queryTime, false);
      
      return result;
    } catch (error) {
      this.recordQueryStats(queryKey, 0, true);
      throw error;
    } finally {
      // Release connection
      const currentConnections = this.connectionPool.get(queryKey) || 0;
      this.connectionPool.set(queryKey, Math.max(0, currentConnections - 1));
    }
  }

  // Record query performance statistics
  private recordQueryStats(queryKey: string, queryTime: number, isError: boolean): void {
    const stats = this.queryStats.get(queryKey) || { count: 0, avgTime: 0, errors: 0 };
    
    stats.count++;
    if (isError) {
      stats.errors++;
    } else {
      stats.avgTime = (stats.avgTime * (stats.count - 1) + queryTime) / stats.count;
    }
    
    this.queryStats.set(queryKey, stats);
  }

  // Get query statistics
  getQueryStats(): Map<string, { count: number; avgTime: number; errors: number }> {
    return new Map(this.queryStats);
  }

  // Clear cache
  clearCache(): void {
    this.queryCache.clear();
  }

  // Invalidate specific cache entries
  invalidateCache(pattern: string): void {
    for (const [key] of this.queryCache) {
      if (key.includes(pattern)) {
        this.queryCache.delete(key);
      }
    }
  }

  // Get cache statistics
  getCacheStats(): { size: number; hitRate: number; memoryUsage: number } {
    const size = this.queryCache.size;
    const totalQueries = Array.from(this.queryStats.values()).reduce((sum, stat) => sum + stat.count, 0);
    const cacheHits = totalQueries - Array.from(this.queryStats.values()).reduce((sum, stat) => sum + stat.errors, 0);
    
    return {
      size,
      hitRate: totalQueries > 0 ? cacheHits / totalQueries : 0,
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  // Estimate memory usage of cache
  private estimateMemoryUsage(): number {
    let totalSize = 0;
    for (const [key, value] of this.queryCache) {
      totalSize += key.length * 2; // Unicode characters are 2 bytes
      totalSize += JSON.stringify(value.data).length * 2;
    }
    return totalSize;
  }
}

// Calendar Query Builder
class CalendarQueryBuilder {
  private static instance: CalendarQueryBuilder;
  private baseUrl = '/api/creator';

  static getInstance(): CalendarQueryBuilder {
    if (!CalendarQueryBuilder.instance) {
      CalendarQueryBuilder.instance = new CalendarQueryBuilder();
    }
    return CalendarQueryBuilder.instance;
  }

  // Build optimized events query
  buildEventsQuery(username: string, options: {
    dateRange?: { start: Date; end: Date };
    eventTypes?: string[];
    priorities?: string[];
    limit?: number;
    offset?: number;
  } = {}): string {
    const { dateRange, eventTypes, priorities, limit, offset } = options;
    
    let query = `${this.baseUrl}/${username}/events`;
    const params = new URLSearchParams();

    if (dateRange) {
      params.append('start', dateRange.start.toISOString());
      params.append('end', dateRange.end.toISOString());
    }

    if (eventTypes && eventTypes.length > 0) {
      params.append('types', eventTypes.join(','));
    }

    if (priorities && priorities.length > 0) {
      params.append('priorities', priorities.join(','));
    }

    if (limit) {
      params.append('limit', limit.toString());
    }

    if (offset) {
      params.append('offset', offset.toString());
    }

    const queryString = params.toString();
    return queryString ? `${query}?${queryString}` : query;
  }

  // Build creator lookup query
  buildCreatorQuery(username: string): string {
    return `${this.baseUrl}/${username}/profile`;
  }

  // Build batch events query
  buildBatchEventsQuery(usernames: string[], dateRange: { start: Date; end: Date }): string {
    const params = new URLSearchParams();
    params.append('usernames', usernames.join(','));
    params.append('start', dateRange.start.toISOString());
    params.append('end', dateRange.end.toISOString());
    
    return `${this.baseUrl}/batch/events?${params.toString()}`;
  }
}

// Request Batching System
class CalendarRequestBatcher {
  private static instance: CalendarRequestBatcher;
  private batchQueue = new Map<string, {
    requests: Array<{ resolve: (value: any) => void; reject: (error: any) => void }>;
    timer: NodeJS.Timeout;
  }>();
  private batchDelay = 100; // 100ms batching window

  static getInstance(): CalendarRequestBatcher {
    if (!CalendarRequestBatcher.instance) {
      CalendarRequestBatcher.instance = new CalendarRequestBatcher();
    }
    return CalendarRequestBatcher.instance;
  }

  // Add request to batch
  batchRequest<T>(batchKey: string, request: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const batch = this.batchQueue.get(batchKey);
      
      if (batch) {
        batch.requests.push({ resolve, reject });
      } else {
        const newBatch = {
          requests: [{ resolve, reject }],
          timer: setTimeout(() => this.processBatch(batchKey, request), this.batchDelay)
        };
        this.batchQueue.set(batchKey, newBatch);
      }
    });
  }

  // Process batched requests
  private async processBatch<T>(batchKey: string, request: () => Promise<T>): Promise<void> {
    const batch = this.batchQueue.get(batchKey);
    if (!batch) return;

    try {
      const result = await request();
      batch.requests.forEach(({ resolve }) => resolve(result));
    } catch (error) {
      batch.requests.forEach(({ reject }) => reject(error));
    } finally {
      this.batchQueue.delete(batchKey);
    }
  }

  // Clear all batches
  clearBatches(): void {
    for (const [key, batch] of this.batchQueue) {
      clearTimeout(batch.timer);
      batch.requests.forEach(({ reject }) => reject(new Error('Batch cleared')));
    }
    this.batchQueue.clear();
  }
}

// Database optimization hook
export const useCalendarDatabaseOptimization = (username: string) => {
  const queryClient = useQueryClient();
  const optimizer = CalendarDatabaseOptimizer.getInstance();
  const queryBuilder = CalendarQueryBuilder.getInstance();
  const batcher = CalendarRequestBatcher.getInstance();
  
  // Optimized events query
  const useOptimizedEventsQuery = useCallback((options: {
    dateRange?: { start: Date; end: Date };
    eventTypes?: string[];
    priorities?: string[];
    enabled?: boolean;
  } = {}) => {
    const { dateRange, eventTypes, priorities, enabled = true } = options;
    
    return useQuery({
      queryKey: ['calendar-events', username, dateRange, eventTypes, priorities],
      enabled: enabled && !!username,
      staleTime: 2 * 60 * 1000, // 2 minutes
      cacheTime: 5 * 60 * 1000, // 5 minutes
      queryFn: async () => {
        const queryUrl = queryBuilder.buildEventsQuery(username, {
          dateRange,
          eventTypes,
          priorities
        });
        
        const queryKey = `events_${username}_${JSON.stringify(options)}`;
        
        return optimizer.optimizeQuery(queryKey, async () => {
          const response = await fetch(queryUrl);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        });
      }
    });
  }, [username, optimizer, queryBuilder]);

  // Batched events query
  const useBatchedEventsQuery = useCallback((usernames: string[], dateRange: { start: Date; end: Date }) => {
    return useQuery({
      queryKey: ['calendar-batch-events', usernames, dateRange],
      enabled: usernames.length > 0,
      staleTime: 1 * 60 * 1000, // 1 minute for batch queries
      queryFn: async () => {
        const batchKey = `batch_${usernames.join('_')}_${dateRange.start.toISOString()}_${dateRange.end.toISOString()}`;
        
        return batcher.batchRequest(batchKey, async () => {
          const queryUrl = queryBuilder.buildBatchEventsQuery(usernames, dateRange);
          const response = await fetch(queryUrl);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        });
      }
    });
  }, [batcher, queryBuilder]);

  // Prefetch adjacent months
  const prefetchAdjacentMonths = useCallback(async (currentMonth: Date) => {
    const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    const prevMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    
    const prefetchMonth = async (month: Date) => {
      const startDate = new Date(month.getFullYear(), month.getMonth(), 1);
      const endDate = new Date(month.getFullYear(), month.getMonth() + 1, 0);
      
      const queryUrl = queryBuilder.buildEventsQuery(username, {
        dateRange: { start: startDate, end: endDate }
      });
      
      const queryKey = `prefetch_${username}_${month.getFullYear()}_${month.getMonth()}`;
      
      try {
        await optimizer.optimizeQuery(queryKey, async () => {
          const response = await fetch(queryUrl);
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          return response.json();
        }, { ttl: 5 * 60 * 1000 }); // 5 minutes TTL for prefetched data
      } catch (error) {
        console.warn('Prefetch failed for month:', month, error);
      }
    };

    // Prefetch in background
    Promise.all([
      prefetchMonth(nextMonth),
      prefetchMonth(prevMonth)
    ]).catch(console.warn);
  }, [username, optimizer, queryBuilder]);

  // Invalidate cache
  const invalidateCalendarCache = useCallback(() => {
    optimizer.invalidateCache(username);
    queryClient.invalidateQueries({ queryKey: ['calendar-events', username] });
  }, [username, optimizer, queryClient]);

  // Get optimization statistics
  const getOptimizationStats = useCallback(() => {
    return {
      queryStats: optimizer.getQueryStats(),
      cacheStats: optimizer.getCacheStats()
    };
  }, [optimizer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      batcher.clearBatches();
    };
  }, [batcher]);

  return {
    useOptimizedEventsQuery,
    useBatchedEventsQuery,
    prefetchAdjacentMonths,
    invalidateCalendarCache,
    getOptimizationStats,
    optimizer,
    queryBuilder,
    batcher
  };
};

export default useCalendarDatabaseOptimization;