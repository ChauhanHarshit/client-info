import React, { useEffect, useRef, useState, useCallback, memo } from 'react';
import { useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';

// Component cache for frequently accessed components
const componentCache = new Map<string, React.ComponentType<any>>();
const componentMetrics = new Map<string, {
  renderTime: number;
  mountTime: number;
  lastUsed: number;
}>();

/**
 * Progressive Loading System
 * Loads components in stages for better perceived performance
 */
export class ProgressiveLoadingSystem {
  private static instance: ProgressiveLoadingSystem;
  private loadingStages = new Map<string, {
    stage: number;
    totalStages: number;
    components: React.ComponentType<any>[];
  }>();

  static getInstance(): ProgressiveLoadingSystem {
    if (!ProgressiveLoadingSystem.instance) {
      ProgressiveLoadingSystem.instance = new ProgressiveLoadingSystem();
    }
    return ProgressiveLoadingSystem.instance;
  }

  /**
   * Register component for progressive loading
   */
  registerComponent(route: string, component: React.ComponentType<any>, stage: number, totalStages: number): void {
    const key = `${route}_${stage}`;

    if (!this.loadingStages.has(key)) {
      this.loadingStages.set(key, {
        stage,
        totalStages,
        components: [],
      });
    }

    this.loadingStages.get(key)!.components.push(component);
  }

  /**
   * Get components for loading stage
   */
  getComponentsForStage(route: string, stage: number): React.ComponentType<any>[] {
    const key = `${route}_${stage}`;
    return this.loadingStages.get(key)?.components || [];
  }

  /**
   * Get total stages for route
   */
  getTotalStages(route: string): number {
    const stages = Array.from(this.loadingStages.keys())
      .filter(key => key.startsWith(route))
      .map(key => parseInt(key.split('_')[1]));

    return stages.length > 0 ? Math.max(...stages) : 1;
  }
}

/**
 * Progressive Loading Hook
 * Manages progressive component loading for routes
 */
export function useProgressiveLoading(route: string) {
  const [currentStage, setCurrentStage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const progressiveSystem = ProgressiveLoadingSystem.getInstance();
  const totalStages = progressiveSystem.getTotalStages(route);

  /**
   * Advance to next loading stage
   */
  const advanceStage = useCallback(() => {
    setCurrentStage(prev => {
      const next = prev + 1;
      if (next > totalStages) {
        setIsLoading(false);
      }
      return Math.min(next, totalStages);
    });
  }, [totalStages]);

  /**
   * Reset loading stages
   */
  const resetStages = useCallback(() => {
    setCurrentStage(1);
    setIsLoading(true);
  }, []);

  return {
    currentStage,
    totalStages,
    isLoading,
    advanceStage,
    resetStages,
  };
}

/**
 * Intelligent Component Caching System
 */
export class IntelligentComponentCache {
  private static instance: IntelligentComponentCache;
  private cache = new Map<string, {
    component: React.ComponentType<any>;
    lastUsed: number;
    useCount: number;
    size: number;
  }>();
  private maxCacheSize = 50; // Maximum number of cached components
  private maxAge = 10 * 60 * 1000; // 10 minutes

  static getInstance(): IntelligentComponentCache {
    if (!IntelligentComponentCache.instance) {
      IntelligentComponentCache.instance = new IntelligentComponentCache();
    }
    return IntelligentComponentCache.instance;
  }

  /**
   * Cache component with metadata
   */
  set(key: string, component: React.ComponentType<any>, size: number = 1): void {
    this.cache.set(key, {
      component,
      lastUsed: Date.now(),
      useCount: 1,
      size,
    });

    this.cleanupCache();
  }

  /**
   * Get cached component
   */
  get(key: string): React.ComponentType<any> | null {
    const cached = this.cache.get(key);

    if (cached) {
      // Update usage stats
      cached.lastUsed = Date.now();
      cached.useCount++;

      // Check if still valid
      if (Date.now() - cached.lastUsed < this.maxAge) {
        return cached.component;
      } else {
        this.cache.delete(key);
      }
    }

    return null;
  }

  /**
   * Clean up cache using LRU strategy
   */
  private cleanupCache(): void {
    const now = Date.now();

    // Remove expired entries
    for (const [key, cached] of this.cache) {
      if (now - cached.lastUsed > this.maxAge) {
        this.cache.delete(key);
      }
    }

    // Remove least recently used if cache is full
    if (this.cache.size > this.maxCacheSize) {
      const sorted = Array.from(this.cache.entries())
        .sort(([, a], [, b]) => a.lastUsed - b.lastUsed);

      const toRemove = sorted.slice(0, this.cache.size - this.maxCacheSize);
      toRemove.forEach(([key]) => this.cache.delete(key));
    }
  }

  /**
   * Get cache stats
   */
  getStats(): {
    size: number;
    hitRate: number;
    mostUsed: string[];
  } {
    const entries = Array.from(this.cache.entries());

    return {
      size: entries.length,
      hitRate: entries.reduce((sum, [, cached]) => sum + cached.useCount, 0) / entries.length || 0,
      mostUsed: entries
        .sort(([, a], [, b]) => b.useCount - a.useCount)
        .slice(0, 5)
        .map(([key]) => key),
    };
  }
}

/**
 * Component Performance Monitor
 */
export class ComponentPerformanceMonitor {
  private static instance: ComponentPerformanceMonitor;
  private metrics = new Map<string, {
    renderTimes: number[];
    mountTimes: number[];
    errorCount: number;
    lastError?: Error;
  }>();

  static getInstance(): ComponentPerformanceMonitor {
    if (!ComponentPerformanceMonitor.instance) {
      ComponentPerformanceMonitor.instance = new ComponentPerformanceMonitor();
    }
    return ComponentPerformanceMonitor.instance;
  }

  /**
   * Track component render time
   */
  trackRender(componentName: string, renderTime: number): void {
    if (!this.metrics.has(componentName)) {
      this.metrics.set(componentName, {
        renderTimes: [],
        mountTimes: [],
        errorCount: 0,
      });
    }

    const metrics = this.metrics.get(componentName)!;
    metrics.renderTimes.push(renderTime);

    // Keep only last 20 measurements
    if (metrics.renderTimes.length > 20) {
      metrics.renderTimes.shift();
    }
  }

  /**
   * Track component mount time
   */
  trackMount(componentName: string, mountTime: number): void {
    if (!this.metrics.has(componentName)) {
      this.metrics.set(componentName, {
        renderTimes: [],
        mountTimes: [],
        errorCount: 0,
      });
    }

    const metrics = this.metrics.get(componentName)!;
    metrics.mountTimes.push(mountTime);

    // Keep only last 20 measurements
    if (metrics.mountTimes.length > 20) {
      metrics.mountTimes.shift();
    }
  }

  /**
   * Track component error
   */
  trackError(componentName: string, error: Error): void {
    if (!this.metrics.has(componentName)) {
      this.metrics.set(componentName, {
        renderTimes: [],
        mountTimes: [],
        errorCount: 0,
      });
    }

    const metrics = this.metrics.get(componentName)!;
    metrics.errorCount++;
    metrics.lastError = error;
  }

  /**
   * Get performance stats for component
   */
  getStats(componentName: string): {
    averageRenderTime: number;
    averageMountTime: number;
    errorRate: number;
    sampleCount: number;
  } | null {
    const metrics = this.metrics.get(componentName);
    if (!metrics) return null;

    const renderTimes = metrics.renderTimes;
    const mountTimes = metrics.mountTimes;
    const totalSamples = renderTimes.length + mountTimes.length;

    return {
      averageRenderTime: renderTimes.length > 0 
        ? renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length 
        : 0,
      averageMountTime: mountTimes.length > 0 
        ? mountTimes.reduce((a, b) => a + b, 0) / mountTimes.length 
        : 0,
      errorRate: totalSamples > 0 ? metrics.errorCount / totalSamples : 0,
      sampleCount: totalSamples,
    };
  }

  /**
   * Get all performance metrics
   */
  getAllStats(): Record<string, any> {
    const stats: Record<string, any> = {};

    for (const [componentName] of this.metrics) {
      stats[componentName] = this.getStats(componentName);
    }

    return stats;
  }
}

/**
 * Performance Tracking Hook
 */
export function useComponentPerformanceTracking(componentName: string) {
  const monitor = ComponentPerformanceMonitor.getInstance();
  const renderStartRef = useRef<number>();
  const mountStartRef = useRef<number>();

  // Track mount time
  useEffect(() => {
    mountStartRef.current = performance.now();

    return () => {
      if (mountStartRef.current) {
        const mountTime = performance.now() - mountStartRef.current;
        monitor.trackMount(componentName, mountTime);
      }
    };
  }, [componentName, monitor]);

  // Track render time
  useEffect(() => {
    renderStartRef.current = performance.now();
  });

  useEffect(() => {
    if (renderStartRef.current) {
      const renderTime = performance.now() - renderStartRef.current;
      monitor.trackRender(componentName, renderTime);
    }
  });

  return {
    trackError: (error: Error) => monitor.trackError(componentName, error),
    getStats: () => monitor.getStats(componentName),
  };
}

/**
 * Optimized Component Wrapper
 * High-order component that adds performance optimizations
 */
export function withComponentOptimizations<P extends object>(
  Component: React.ComponentType<P>,
  options: {
    displayName?: string;
    enableCache?: boolean;
    enablePerformanceTracking?: boolean;
    enableProgressiveLoading?: boolean;
  } = {}
): React.ComponentType<P> {
  const {
    displayName = Component.displayName || Component.name || 'Component',
    enableCache = true,
    enablePerformanceTracking = true,
    enableProgressiveLoading = false,
  } = options;

  const OptimizedComponent = memo((props: P) => {
    const [location] = useLocation();
    const cache = IntelligentComponentCache.getInstance();
    const { trackError } = useComponentPerformanceTracking(displayName);

    // Try to get from cache first
    const cachedComponent = enableCache ? cache.get(`${displayName}_${location}`) : null;

    if (cachedComponent) {
      return React.createElement(cachedComponent, props);
    }

    try {
      const element = React.createElement(Component, props);

      // Cache the component
      if (enableCache) {
        cache.set(`${displayName}_${location}`, Component);
      }

      return element;
    } catch (error) {
      if (enablePerformanceTracking) {
        trackError(error as Error);
      }
      throw error;
    }
  });

  OptimizedComponent.displayName = `Optimized(${displayName})`;

  return OptimizedComponent;
}

/**
 * Skeleton Loading Component
 * Smart skeleton that adapts to component structure
 */
export function SkeletonLoader({ 
  variant = 'default',
  lines = 3,
  height = 'auto',
  className = '',
}: {
  variant?: 'default' | 'card' | 'table' | 'form';
  lines?: number;
  height?: string;
  className?: string;
}) {
  const skeletonClasses = `animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`;

  const variants = {
    default: React.createElement('div', { className: skeletonClasses, style: { height } },
      Array.from({ length: lines }).map((_, i) =>
        React.createElement('div', { 
          key: i, 
          className: "h-4 bg-gray-300 dark:bg-gray-600 rounded mb-2 last:mb-0" 
        })
      )
    ),
    card: React.createElement('div', { className: `${skeletonClasses} p-4 space-y-3` },
      React.createElement('div', { className: "h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4" }),
      React.createElement('div', { className: "h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2" }),
      React.createElement('div', { className: "h-4 bg-gray-300 dark:bg-gray-600 rounded w-full" })
    ),
    table: React.createElement('div', { className: `${skeletonClasses} space-y-2` },
      React.createElement('div', { className: "h-6 bg-gray-300 dark:bg-gray-600 rounded" }),
      ...Array.from({ length: lines }).map((_, i) =>
        React.createElement('div', { key: i, className: "h-4 bg-gray-300 dark:bg-gray-600 rounded" })
      )
    ),
    form: React.createElement('div', { className: `${skeletonClasses} space-y-4` },
      ...Array.from({ length: lines }).map((_, i) =>
        React.createElement('div', { key: i, className: "space-y-2" },
          React.createElement('div', { className: "h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/4" }),
          React.createElement('div', { className: "h-8 bg-gray-300 dark:bg-gray-600 rounded" })
        )
      )
    ),
  };

  return variants[variant];
}

/**
 * Route-Specific Skeleton Components
 */
export const CustomsDashboardSkeleton = () => 
  React.createElement('div', { className: "space-y-6" },
    React.createElement('div', { className: "grid grid-cols-1 md:grid-cols-4 gap-4" },
      ...Array.from({ length: 4 }).map((_, i) =>
        React.createElement(SkeletonLoader, { key: i, variant: "card", lines: 2 })
      )
    ),
    React.createElement(SkeletonLoader, { variant: "table", lines: 6 })
  );

export const CustomsTeamLinksSkeleton = () => 
  React.createElement('div', { className: "space-y-6" },
    React.createElement(SkeletonLoader, { variant: "card", lines: 1 }),
    React.createElement(SkeletonLoader, { variant: "table", lines: 8 })
  );

export const CreatorAppLayoutSkeleton = () => 
  React.createElement('div', { className: "space-y-4" },
    React.createElement('div', { className: "h-16 bg-gray-200 dark:bg-gray-700 rounded" }),
    React.createElement('div', { className: "grid grid-cols-1 gap-4" },
      ...Array.from({ length: 3 }).map((_, i) =>
        React.createElement(SkeletonLoader, { key: i, variant: "card", lines: 3 })
      )
    )
  );

/**
 * Initialize component optimizations
 */
export function initializeComponentOptimizations(): void {
  const cache = IntelligentComponentCache.getInstance();
  const monitor = ComponentPerformanceMonitor.getInstance();
  const progressiveSystem = ProgressiveLoadingSystem.getInstance();

  // Register route-specific loading stages
  progressiveSystem.registerComponent('/customs-dashboard', CustomsDashboardSkeleton, 1, 2);
  progressiveSystem.registerComponent('/customs-team-links', CustomsTeamLinksSkeleton, 1, 2);
  progressiveSystem.registerComponent('/creator-app-layout', CreatorAppLayoutSkeleton, 1, 2);

  console.log('⚡ Component optimizations initialized');
}
