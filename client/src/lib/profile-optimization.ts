/**
 * Comprehensive Profile Tab Performance Optimization System
 * Handles all performance enhancements for /creator-app-layout Profile tab
 * Zero-impact additive layer preserving all existing functionality
 */

import { QueryClient } from '@tanstack/react-query';
import { apiRequest } from './queryClient';

// Performance monitoring interface
interface ProfilePerformanceMetrics {
  profileLoadTime: number;
  bookmarkLoadTime: number;
  imageLoadTime: number;
  totalMemoryUsage: number;
  apiCallCount: number;
  errorCount: number;
  lastOptimized: number;
}

// Profile optimization configuration
const PROFILE_OPTIMIZATION_CONFIG = {
  // Caching settings
  PROFILE_CACHE_TIME: 120000, // 2 minutes
  BOOKMARK_CACHE_TIME: 180000, // 3 minutes
  IMAGE_CACHE_TIME: 600000, // 10 minutes
  
  // Performance thresholds
  MEMORY_THRESHOLD: 50 * 1024 * 1024, // 50MB
  LOAD_TIME_THRESHOLD: 2000, // 2 seconds
  
  // Optimization intervals
  CLEANUP_INTERVAL: 300000, // 5 minutes
  MONITORING_INTERVAL: 60000, // 1 minute
  
  // Prefetch settings
  PREFETCH_DELAY: 1000, // 1 second
  MAX_PREFETCH_ITEMS: 20,
  
  // Mobile optimization
  MOBILE_BREAKPOINT: 768,
  MOBILE_CACHE_REDUCTION: 0.5,
  
  // Virtual scrolling
  VIRTUAL_ITEM_HEIGHT: 80,
  VIRTUAL_BUFFER_SIZE: 5,
  
  // Background processing
  BATCH_SIZE: 10,
  PROCESSING_DELAY: 100,
};

// Global performance metrics
let performanceMetrics: ProfilePerformanceMetrics = {
  profileLoadTime: 0,
  bookmarkLoadTime: 0,
  imageLoadTime: 0,
  totalMemoryUsage: 0,
  apiCallCount: 0,
  errorCount: 0,
  lastOptimized: Date.now(),
};

// Memory monitoring
const memoryMonitor = {
  monitor: () => {
    if ('memory' in performance) {
      const memInfo = (performance as any).memory;
      performanceMetrics.totalMemoryUsage = memInfo.usedJSHeapSize;
      
      // Trigger cleanup if memory usage is high
      if (memInfo.usedJSHeapSize > PROFILE_OPTIMIZATION_CONFIG.MEMORY_THRESHOLD) {
        profileOptimizer.cleanup();
      }
    }
  },
  
  startMonitoring: () => {
    setInterval(memoryMonitor.monitor, PROFILE_OPTIMIZATION_CONFIG.MONITORING_INTERVAL);
  }
};

// Profile data caching system
class ProfileDataCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private imageCache = new Map<string, HTMLImageElement>();
  
  set(key: string, data: any, ttl: number = PROFILE_OPTIMIZATION_CONFIG.PROFILE_CACHE_TIME) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }
  
  get(key: string) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }
  
  // Image caching with preloading
  preloadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      if (this.imageCache.has(url)) {
        resolve(this.imageCache.get(url)!);
        return;
      }
      
      const img = new Image();
      img.onload = () => {
        this.imageCache.set(url, img);
        resolve(img);
      };
      img.onerror = reject;
      img.src = url;
    });
  }
  
  clear() {
    this.cache.clear();
    this.imageCache.clear();
  }
  
  cleanup() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

// Optimized API request handler
class ProfileAPIOptimizer {
  private requestQueue: Array<{ key: string; request: () => Promise<any>; resolve: (data: any) => void; reject: (error: any) => void }> = [];
  private processingQueue = false;
  private cache = new ProfileDataCache();
  
  async makeOptimizedRequest(key: string, requestFn: () => Promise<any>, cacheTime?: number): Promise<any> {
    // Check cache first
    const cached = this.cache.get(key);
    if (cached) {
      return cached;
    }
    
    // Add to queue for batch processing
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        key,
        request: requestFn,
        resolve,
        reject
      });
      
      if (!this.processingQueue) {
        this.processQueue();
      }
    });
  }
  
  private async processQueue() {
    this.processingQueue = true;
    
    while (this.requestQueue.length > 0) {
      const batch = this.requestQueue.splice(0, PROFILE_OPTIMIZATION_CONFIG.BATCH_SIZE);
      
      // Process batch requests
      const promises = batch.map(async (item) => {
        try {
          const startTime = Date.now();
          const result = await item.request();
          
          // Cache result
          this.cache.set(item.key, result);
          
          // Track performance
          performanceMetrics.apiCallCount++;
          const loadTime = Date.now() - startTime;
          
          if (item.key.includes('profile')) {
            performanceMetrics.profileLoadTime = loadTime;
          } else if (item.key.includes('bookmark')) {
            performanceMetrics.bookmarkLoadTime = loadTime;
          }
          
          item.resolve(result);
        } catch (error) {
          performanceMetrics.errorCount++;
          item.reject(error);
        }
      });
      
      await Promise.all(promises);
      
      // Small delay between batches to prevent overwhelming the server
      if (this.requestQueue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, PROFILE_OPTIMIZATION_CONFIG.PROCESSING_DELAY));
      }
    }
    
    this.processingQueue = false;
  }
  
  // Prefetch profile data
  async prefetchProfileData(username: string, queryClient: QueryClient) {
    const prefetchTasks = [
      // Prefetch profile data
      queryClient.prefetchQuery({
        queryKey: [`/api/creator/${username}/profile`],
        queryFn: () => this.makeOptimizedRequest(
          `profile-${username}`,
          () => apiRequest('GET', `/api/creator/${username}/profile`).then(r => r.json())
        ),
        staleTime: PROFILE_OPTIMIZATION_CONFIG.PROFILE_CACHE_TIME,
      }),
      
      // Prefetch bookmark data
      queryClient.prefetchQuery({
        queryKey: [`/api/creator/${username}/bookmarks`],
        queryFn: () => this.makeOptimizedRequest(
          `bookmarks-${username}`,
          () => fetch(`/api/creator/${username}/bookmarks`, { credentials: 'include' }).then(r => r.json())
        ),
        staleTime: PROFILE_OPTIMIZATION_CONFIG.BOOKMARK_CACHE_TIME,
      }),
    ];
    
    await Promise.allSettled(prefetchTasks);
  }
  
  // Batch profile data loading
  async loadProfileDataBatch(username: string) {
    const batchRequests = {
      profile: () => apiRequest('GET', `/api/creator/${username}/profile`).then(r => r.json()),
      bookmarks: () => fetch(`/api/creator/${username}/bookmarks`, { credentials: 'include' }).then(r => r.json()),
      aesthetics: () => apiRequest('GET', `/api/creator/${username}/available-aesthetics`).then(r => r.json()),
    };
    
    const results = await Promise.allSettled(
      Object.entries(batchRequests).map(([key, request]) =>
        this.makeOptimizedRequest(`batch-${key}-${username}`, request)
      )
    );
    
    return {
      profile: results[0].status === 'fulfilled' ? results[0].value : null,
      bookmarks: results[1].status === 'fulfilled' ? results[1].value : null,
      aesthetics: results[2].status === 'fulfilled' ? results[2].value : null,
    };
  }
  
  clearCache() {
    this.cache.clear();
  }
}

// Virtual scrolling for bookmark folders
class BookmarkVirtualScroller {
  private containerHeight: number;
  private itemHeight: number;
  private buffer: number;
  
  constructor(
    containerHeight: number = 400,
    itemHeight: number = PROFILE_OPTIMIZATION_CONFIG.VIRTUAL_ITEM_HEIGHT,
    buffer: number = PROFILE_OPTIMIZATION_CONFIG.VIRTUAL_BUFFER_SIZE
  ) {
    this.containerHeight = containerHeight;
    this.itemHeight = itemHeight;
    this.buffer = buffer;
  }
  
  calculateVisibleRange(scrollTop: number, totalItems: number) {
    const visibleCount = Math.ceil(this.containerHeight / this.itemHeight);
    const startIndex = Math.floor(scrollTop / this.itemHeight);
    const endIndex = Math.min(startIndex + visibleCount + this.buffer, totalItems);
    
    return {
      start: Math.max(0, startIndex - this.buffer),
      end: endIndex,
      totalHeight: totalItems * this.itemHeight,
    };
  }
  
  getTransform(index: number) {
    return `translateY(${index * this.itemHeight}px)`;
  }
}

// Mobile optimization utilities
const mobileOptimizer = {
  isMobile: () => window.innerWidth < PROFILE_OPTIMIZATION_CONFIG.MOBILE_BREAKPOINT,
  
  getOptimizedCacheTime: (baseTime: number) => {
    return mobileOptimizer.isMobile() 
      ? baseTime * PROFILE_OPTIMIZATION_CONFIG.MOBILE_CACHE_REDUCTION 
      : baseTime;
  },
  
  optimizeForTouch: (element: HTMLElement) => {
    element.style.touchAction = 'manipulation';
    element.style.webkitTapHighlightColor = 'transparent';
  },
  
  detectNetworkSpeed: () => {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      return connection.effectiveType || '4g';
    }
    return '4g';
  },
  
  adaptToNetwork: (networkSpeed: string) => {
    const multiplier = {
      'slow-2g': 0.25,
      '2g': 0.5,
      '3g': 0.75,
      '4g': 1.0,
    }[networkSpeed] || 1.0;
    
    return {
      cacheTime: PROFILE_OPTIMIZATION_CONFIG.PROFILE_CACHE_TIME * multiplier,
      batchSize: Math.ceil(PROFILE_OPTIMIZATION_CONFIG.BATCH_SIZE * multiplier),
    };
  }
};

// Background processing with Web Workers
class BackgroundProcessor {
  private worker: Worker | null = null;
  
  constructor() {
    if (typeof Worker !== 'undefined') {
      this.initializeWorker();
    }
  }
  
  private initializeWorker() {
    const workerCode = `
      self.onmessage = function(e) {
        const { type, data } = e.data;
        
        switch(type) {
          case 'PROCESS_BOOKMARKS':
            const processed = processBookmarks(data);
            self.postMessage({ type: 'BOOKMARKS_PROCESSED', data: processed });
            break;
          case 'CALCULATE_STATS':
            const stats = calculateProfileStats(data);
            self.postMessage({ type: 'STATS_CALCULATED', data: stats });
            break;
        }
      };
      
      function processBookmarks(folders) {
        // Ensure folders is an array
        if (!Array.isArray(folders)) {
          console.warn('processBookmarks: folders is not an array', folders);
          return [];
        }
        
        return folders.map(folder => ({
          ...folder,
          itemCount: folder.items ? folder.items.length : 0,
          totalSize: folder.items ? folder.items.reduce((sum, item) => sum + (item.size || 0), 0) : 0
        }));
      }
      
      function calculateProfileStats(data) {
        const { bookmarks, completedContent, totalContent } = data;
        return {
          totalBookmarks: bookmarks.length,
          completionRate: totalContent > 0 ? (completedContent / totalContent) * 100 : 0,
          averageBookmarksPerFolder: bookmarks.length > 0 ? bookmarks.reduce((sum, folder) => sum + folder.itemCount, 0) / bookmarks.length : 0
        };
      }
    `;
    
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    this.worker = new Worker(URL.createObjectURL(blob));
  }
  
  processInBackground(type: string, data: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        // Fallback to main thread processing
        resolve(this.processOnMainThread(type, data));
        return;
      }
      
      const handleMessage = (e: MessageEvent) => {
        if (e.data.type === `${type}_PROCESSED` || e.data.type === `${type}_CALCULATED`) {
          this.worker!.removeEventListener('message', handleMessage);
          resolve(e.data.data);
        }
      };
      
      this.worker.addEventListener('message', handleMessage);
      this.worker.postMessage({ type, data });
      
      // Timeout fallback
      setTimeout(() => {
        this.worker!.removeEventListener('message', handleMessage);
        resolve(this.processOnMainThread(type, data));
      }, 5000);
    });
  }
  
  private processOnMainThread(type: string, data: any) {
    // Fallback processing on main thread
    switch(type) {
      case 'PROCESS_BOOKMARKS':
        // Ensure data is an array
        if (!Array.isArray(data)) {
          console.warn('processOnMainThread: data is not an array for PROCESS_BOOKMARKS', data);
          return [];
        }
        
        return data.map((folder: any) => ({
          ...folder,
          itemCount: folder.items ? folder.items.length : 0,
          totalSize: folder.items ? folder.items.reduce((sum: number, item: any) => sum + (item.size || 0), 0) : 0
        }));
      case 'CALCULATE_STATS':
        return {
          totalBookmarks: data.bookmarks?.length || 0,
          completionRate: data.totalContent > 0 ? (data.completedContent / data.totalContent) * 100 : 0,
          averageBookmarksPerFolder: data.bookmarks?.length > 0 ? data.bookmarks.reduce((sum: number, folder: any) => sum + (folder.itemCount || 0), 0) / data.bookmarks.length : 0
        };
      default:
        return data;
    }
  }
  
  terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}

// Main profile optimizer
export const profileOptimizer = {
  apiOptimizer: new ProfileAPIOptimizer(),
  virtualScroller: new BookmarkVirtualScroller(),
  backgroundProcessor: new BackgroundProcessor(),
  
  // Initialize optimization system
  initialize: (queryClient: QueryClient) => {
    console.log('🚀 Profile optimization system initializing...');
    
    // Start memory monitoring
    memoryMonitor.startMonitoring();
    
    // Setup cleanup intervals
    setInterval(() => {
      profileOptimizer.cleanup();
    }, PROFILE_OPTIMIZATION_CONFIG.CLEANUP_INTERVAL);
    
    // Setup performance monitoring
    setInterval(() => {
      profileOptimizer.reportPerformance();
    }, PROFILE_OPTIMIZATION_CONFIG.MONITORING_INTERVAL);
    
    console.log('✅ Profile optimization system initialized');
  },
  
  // Cleanup resources
  cleanup: () => {
    performanceMetrics.lastOptimized = Date.now();
    profileOptimizer.apiOptimizer.clearCache();
    
    // Force garbage collection if available
    if ('gc' in window) {
      (window as any).gc();
    }
  },
  
  // Get performance metrics
  getMetrics: () => ({ ...performanceMetrics }),
  
  // Report performance
  reportPerformance: () => {
    const metrics = profileOptimizer.getMetrics();
    console.log('📊 Profile Performance Metrics:', {
      profileLoadTime: `${metrics.profileLoadTime}ms`,
      bookmarkLoadTime: `${metrics.bookmarkLoadTime}ms`,
      memoryUsage: `${(metrics.totalMemoryUsage / 1024 / 1024).toFixed(2)}MB`,
      apiCalls: metrics.apiCallCount,
      errors: metrics.errorCount,
      lastOptimized: new Date(metrics.lastOptimized).toLocaleTimeString()
    });
  },
  
  // Optimize profile data loading
  optimizeProfileLoad: async (username: string, queryClient: QueryClient) => {
    const startTime = Date.now();
    
    try {
      // Prefetch data if not already cached
      await profileOptimizer.apiOptimizer.prefetchProfileData(username, queryClient);
      
      // Load batch data
      const batchData = await profileOptimizer.apiOptimizer.loadProfileDataBatch(username);
      
      performanceMetrics.profileLoadTime = Date.now() - startTime;
      
      return batchData;
    } catch (error) {
      performanceMetrics.errorCount++;
      console.error('Profile optimization error:', error);
      throw error;
    }
  },
  
  // Optimize bookmark processing
  optimizeBookmarkProcessing: async (bookmarkData: any) => {
    // Extract folders array from bookmarkData object
    const folders = bookmarkData?.folders || bookmarkData;
    // Ensure we're passing an array
    if (!Array.isArray(folders)) {
      console.warn('optimizeBookmarkProcessing: Invalid bookmark data structure', bookmarkData);
      return [];
    }
    return await profileOptimizer.backgroundProcessor.processInBackground('PROCESS_BOOKMARKS', folders);
  },
  
  // Calculate profile statistics
  calculateProfileStats: async (data: any) => {
    return await profileOptimizer.backgroundProcessor.processInBackground('CALCULATE_STATS', data);
  },
  
  // Get mobile optimizations
  getMobileOptimizations: () => ({
    isMobile: mobileOptimizer.isMobile(),
    cacheTime: mobileOptimizer.getOptimizedCacheTime(PROFILE_OPTIMIZATION_CONFIG.PROFILE_CACHE_TIME),
    networkSpeed: mobileOptimizer.detectNetworkSpeed(),
    adaptations: mobileOptimizer.adaptToNetwork(mobileOptimizer.detectNetworkSpeed()),
  }),
  
  // Shutdown optimization system
  shutdown: () => {
    profileOptimizer.backgroundProcessor.terminate();
    profileOptimizer.apiOptimizer.clearCache();
  }
};

// Export optimization configuration
export { PROFILE_OPTIMIZATION_CONFIG, performanceMetrics, mobileOptimizer };