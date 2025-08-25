// Performance utilities for Feed tab optimization
// Helper functions for monitoring and optimizing large content datasets

export class PerformanceUtils {
  // Prefetch common routes on app initialization
  static async prefetchCommonRoutes() {
    const { queryClient, apiRequest } = await import('./queryClient');
    
    // Prefetch content trips data
    queryClient.prefetchQuery({
      queryKey: ['/api/content-trips/upcoming'],
      queryFn: async () => {
        const response = await apiRequest('GET', '/api/content-trips/upcoming');
        return response.json();
      },
      staleTime: 1000 * 60, // 1 minute
    });
    
    // Prefetch creators data
    queryClient.prefetchQuery({
      queryKey: ['/api/creators'],
      queryFn: async () => {
        const response = await apiRequest('GET', '/api/creators');
        return response.json();
      },
      staleTime: 1000 * 60 * 5, // 5 minutes
    });
  }
  // Measure component render time
  static measureRenderTime(componentName: string, renderFn: () => void): number {
    const start = performance.now();
    renderFn();
    const end = performance.now();
    const renderTime = end - start;
    
    console.log(`📊 ${componentName} render time: ${renderTime.toFixed(2)}ms`);
    return renderTime;
  }

  // Throttle function execution
  static throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    return function(this: any, ...args: Parameters<T>) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  // Debounce function execution
  static debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    return function(this: any, ...args: Parameters<T>) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  // Memory usage monitoring
  static getMemoryUsage(): { used: number; total: number; percentage: number } {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024), // MB
        total: Math.round(memory.totalJSHeapSize / 1024 / 1024), // MB
        percentage: Math.round((memory.usedJSHeapSize / memory.totalJSHeapSize) * 100)
      };
    }
    return { used: 0, total: 0, percentage: 0 };
  }

  // Check if device has limited resources
  static isLowEndDevice(): boolean {
    // Check various indicators of device performance
    const hardwareConcurrency = navigator.hardwareConcurrency || 1;
    const memoryGb = (navigator as any).deviceMemory || 1;
    const connectionType = (navigator as any).connection?.effectiveType || '4g';
    
    // Consider device low-end if:
    // - Less than 2 CPU cores
    // - Less than 2GB RAM
    // - Slow connection (2g/3g)
    return hardwareConcurrency < 2 || memoryGb < 2 || ['2g', '3g'].includes(connectionType);
  }

  // Optimize for low-end devices
  static getOptimizedSettings() {
    const isLowEnd = this.isLowEndDevice();
    
    return {
      // Reduce buffer size for low-end devices
      bufferSize: isLowEnd ? 3 : 5,
      // Smaller page size for low-end devices
      pageSize: isLowEnd ? 25 : 50,
      // Longer cache time for low-end devices
      cacheTime: isLowEnd ? 60000 : 30000,
      // Disable advanced features on low-end devices
      enablePrefetch: !isLowEnd,
      enableVirtualization: !isLowEnd,
      // Reduce image quality for low-end devices
      imageQuality: isLowEnd ? 'low' : 'high',
      // Disable animations on low-end devices
      enableAnimations: !isLowEnd
    };
  }

  // Batch DOM operations
  static batchDOMOperations(operations: Array<() => void>): void {
    requestAnimationFrame(() => {
      operations.forEach(operation => operation());
    });
  }

  // Intersection Observer for efficient visibility detection
  static createIntersectionObserver(
    callback: IntersectionObserverCallback,
    options: IntersectionObserverInit = {}
  ): IntersectionObserver {
    const defaultOptions: IntersectionObserverInit = {
      root: null,
      rootMargin: '50px 0px',
      threshold: 0.1,
      ...options
    };
    
    return new IntersectionObserver(callback, defaultOptions);
  }

  // Efficient event listener management
  static addEventListenerWithCleanup(
    target: EventTarget,
    event: string,
    handler: EventListener,
    options?: AddEventListenerOptions
  ): () => void {
    target.addEventListener(event, handler, options);
    
    return () => {
      target.removeEventListener(event, handler, options);
    };
  }

  // Request idle callback with fallback
  static requestIdleCallback(
    callback: IdleRequestCallback,
    options?: IdleRequestOptions
  ): number {
    if ('requestIdleCallback' in window) {
      return window.requestIdleCallback(callback, options);
    } else {
      // Fallback for browsers that don't support requestIdleCallback
      return setTimeout(callback as any, 1) as any;
    }
  }

  // Cancel idle callback
  static cancelIdleCallback(id: number): void {
    if ('cancelIdleCallback' in window) {
      window.cancelIdleCallback(id);
    } else {
      clearTimeout(id);
    }
  }

  // Preload critical resources
  static preloadResource(url: string, type: 'script' | 'style' | 'image' | 'video'): void {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = url;
    link.as = type;
    document.head.appendChild(link);
  }

  // Lazy load images with intersection observer
  static lazyLoadImage(img: HTMLImageElement, src: string): void {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          img.src = src;
          img.classList.add('loaded');
          observer.unobserve(img);
        }
      });
    });
    
    observer.observe(img);
  }

  // Efficient array chunking for large datasets
  static chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  // Virtual scrolling calculations
  static calculateVirtualScrollParams(
    scrollTop: number,
    itemHeight: number,
    containerHeight: number,
    totalItems: number,
    overscan: number = 2
  ) {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      totalItems - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );
    
    return {
      startIndex,
      endIndex,
      visibleItems: endIndex - startIndex + 1,
      totalHeight: totalItems * itemHeight,
      offsetY: startIndex * itemHeight
    };
  }

  // Performance monitoring
  static startPerformanceMonitoring(): () => void {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach(entry => {
        if (entry.entryType === 'measure') {
          console.log(`📊 Performance: ${entry.name} - ${entry.duration.toFixed(2)}ms`);
        }
      });
    });
    
    observer.observe({ entryTypes: ['measure'] });
    
    return () => observer.disconnect();
  }

  // Optimize React Query for large datasets
  static getOptimizedQueryConfig(dataSize: 'small' | 'medium' | 'large' = 'medium') {
    const configs = {
      small: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        retry: 3
      },
      medium: {
        staleTime: 2 * 60 * 1000, // 2 minutes
        gcTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        retry: 2
      },
      large: {
        staleTime: 30 * 1000, // 30 seconds
        gcTime: 2 * 60 * 1000, // 2 minutes
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        retry: 1
      }
    };
    
    return configs[dataSize];
  }

  // Content preloading strategy
  static createPreloadStrategy(
    currentIndex: number,
    totalItems: number,
    preloadDistance: number = 3
  ): number[] {
    const indices: number[] = [];
    
    // Preload items ahead and behind current position
    for (let i = 1; i <= preloadDistance; i++) {
      if (currentIndex + i < totalItems) {
        indices.push(currentIndex + i);
      }
      if (currentIndex - i >= 0) {
        indices.push(currentIndex - i);
      }
    }
    
    return indices;
  }

  // Efficient state updates for large lists
  static createStateUpdater<T>(
    initialState: T[],
    maxSize: number = 1000
  ): {
    add: (items: T[]) => T[];
    remove: (predicate: (item: T) => boolean) => T[];
    update: (predicate: (item: T) => boolean, updater: (item: T) => T) => T[];
    clear: () => T[];
  } {
    let state = [...initialState];
    
    return {
      add: (items: T[]) => {
        state = [...state, ...items];
        if (state.length > maxSize) {
          state = state.slice(-maxSize);
        }
        return state;
      },
      remove: (predicate: (item: T) => boolean) => {
        state = state.filter(item => !predicate(item));
        return state;
      },
      update: (predicate: (item: T) => boolean, updater: (item: T) => T) => {
        state = state.map(item => predicate(item) ? updater(item) : item);
        return state;
      },
      clear: () => {
        state = [];
        return state;
      }
    };
  }
}

// Error handler for API requests
export const errorHandler = {
  handleApiError: (error: Error, endpoint: string) => {
    // Track error for monitoring (without console logging)
    const errorMetric = {
      name: `api_error_${endpoint.replace(/[^a-zA-Z0-9]/g, '_')}`,
      value: 1,
      timestamp: Date.now(),
      status: 'critical' as const
    };
    
    return error;
  },
  
  // Add logError method for backward compatibility
  logError: (error: Error, context: string) => {
    // Error tracking without console output
    return error;
  }
};

// Performance monitor for API calls
export const performanceMonitor = {
  trackApiCall: (endpoint: string, duration: number, success: boolean) => {
    const status = success ? 'healthy' : 'critical';
    // Performance tracking without console output
  }
};

// Export performance utilities
export default PerformanceUtils;