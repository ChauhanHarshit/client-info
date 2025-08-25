// Feed tab optimization system for handling 5K-10K+ content items
// Pure performance layer - no changes to existing logic, functionality, or layouts

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';

// Types for content optimization
interface ContentItem {
  id: number;
  title: string;
  description?: string;
  mediaUrl?: string;
  mediaType: string;
  thumbnailUrl?: string;
  pageId: number;
  pageName: string;
  isActive: boolean;
  createdAt: string;
  [key: string]: any;
}

interface VirtualScrollConfig {
  itemHeight: number;
  overscan: number;
  viewportHeight: number;
  bufferSize: number;
}

interface OptimizedFeedState {
  visibleItems: ContentItem[];
  totalItems: number;
  scrollOffset: number;
  isLoading: boolean;
  hasMore: boolean;
  currentPage: number;
}

// Virtual scrolling implementation
export class VirtualScrollManager {
  private config: VirtualScrollConfig;
  private containerRef: React.RefObject<HTMLDivElement>;
  private scrollPosition = 0;
  private itemCache = new Map<number, ContentItem>();
  private renderedItems = new Set<number>();
  
  constructor(config: VirtualScrollConfig, containerRef: React.RefObject<HTMLDivElement>) {
    this.config = config;
    this.containerRef = containerRef;
  }

  calculateVisibleRange(scrollTop: number): { start: number; end: number; total: number } {
    const { itemHeight, overscan, viewportHeight } = this.config;
    
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(viewportHeight / itemHeight);
    const end = start + visibleCount + overscan * 2;
    
    return { start, end, total: visibleCount + overscan * 2 };
  }

  getItemStyle(index: number): React.CSSProperties {
    const { itemHeight } = this.config;
    return {
      position: 'absolute',
      top: index * itemHeight,
      left: 0,
      right: 0,
      height: itemHeight,
      transform: `translateY(0px)`,
      willChange: 'transform'
    };
  }

  updateScrollPosition(scrollTop: number) {
    this.scrollPosition = scrollTop;
  }

  getVisibleItems(allItems: ContentItem[], scrollTop: number): ContentItem[] {
    const { start, end } = this.calculateVisibleRange(scrollTop);
    return allItems.slice(start, Math.min(end, allItems.length));
  }

  getTotalHeight(itemCount: number): number {
    return itemCount * this.config.itemHeight;
  }

  cleanup() {
    this.itemCache.clear();
    this.renderedItems.clear();
  }
}

// Content loading and caching system
export class ContentLoader {
  private cache = new Map<string, ContentItem[]>();
  private loadingStates = new Map<string, boolean>();
  private pageSize = 50;
  private maxCacheSize = 500;
  private requestQueue: Array<() => Promise<void>> = [];
  private isProcessingQueue = false;

  async loadContent(creatorUsername: string, page: number = 1): Promise<ContentItem[]> {
    const cacheKey = `${creatorUsername}-${page}`;
    
    // Return cached content if available
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // Prevent duplicate requests
    if (this.loadingStates.get(cacheKey)) {
      return [];
    }

    this.loadingStates.set(cacheKey, true);

    try {
      // Queue the request to prevent overwhelming the server
      const content = await this.queueRequest(async () => {
        const response = await fetch(`/api/creator/${creatorUsername}/content?page=${page}&limit=${this.pageSize}`, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error(`Failed to load content: ${response.status}`);
        }
        
        return await response.json();
      });

      // Cache the content with size limit
      this.setCachedContent(cacheKey, content);
      return content;
    } finally {
      this.loadingStates.set(cacheKey, false);
    }
  }

  private async queueRequest<T>(requestFn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const result = await requestFn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;
    
    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift()!;
      await request();
      
      // Small delay to prevent overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    this.isProcessingQueue = false;
  }

  private setCachedContent(key: string, content: ContentItem[]) {
    // Implement LRU cache with size limit
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, content);
  }

  clearCache() {
    this.cache.clear();
    this.loadingStates.clear();
  }

  preloadContent(creatorUsername: string, currentPage: number) {
    // Preload next page
    this.loadContent(creatorUsername, currentPage + 1);
  }
}

// Memory management for media content
export class MediaManager {
  private activeMedia = new Map<number, HTMLVideoElement | HTMLImageElement>();
  private mediaObserver: IntersectionObserver | null = null;
  private memoryThreshold = 100; // MB
  private cleanupInterval: NodeJS.Timeout | null = null;

  init() {
    this.setupIntersectionObserver();
    this.startMemoryMonitoring();
  }

  private setupIntersectionObserver() {
    this.mediaObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          const mediaId = parseInt(entry.target.getAttribute('data-media-id') || '0');
          
          if (entry.isIntersecting) {
            this.loadMedia(mediaId, entry.target as HTMLElement);
          } else {
            this.unloadMedia(mediaId);
          }
        });
      },
      {
        rootMargin: '50px 0px',
        threshold: 0.1
      }
    );
  }

  private loadMedia(mediaId: number, element: HTMLElement) {
    const mediaUrl = element.getAttribute('data-media-url');
    const mediaType = element.getAttribute('data-media-type');
    
    if (!mediaUrl || this.activeMedia.has(mediaId)) return;

    if (mediaType === 'video') {
      const video = document.createElement('video');
      video.src = mediaUrl;
      video.preload = 'metadata';
      video.muted = true;
      this.activeMedia.set(mediaId, video);
    } else if (mediaType === 'image') {
      const img = new Image();
      img.src = mediaUrl;
      this.activeMedia.set(mediaId, img);
    }
  }

  private unloadMedia(mediaId: number) {
    const media = this.activeMedia.get(mediaId);
    if (media) {
      if (media instanceof HTMLVideoElement) {
        media.pause();
        media.src = '';
        media.load();
      } else if (media instanceof HTMLImageElement) {
        media.src = '';
      }
      this.activeMedia.delete(mediaId);
    }
  }

  observeMedia(element: HTMLElement) {
    if (this.mediaObserver) {
      this.mediaObserver.observe(element);
    }
  }

  unobserveMedia(element: HTMLElement) {
    if (this.mediaObserver) {
      this.mediaObserver.unobserve(element);
    }
  }

  private startMemoryMonitoring() {
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveMedia();
    }, 30000); // Clean up every 30 seconds
  }

  private cleanupInactiveMedia() {
    const now = Date.now();
    const inactiveThreshold = 60000; // 1 minute
    
    // Remove media that hasn't been accessed recently
    this.activeMedia.forEach((media, id) => {
      const lastAccessed = (media as any).lastAccessed || 0;
      if (now - lastAccessed > inactiveThreshold) {
        this.unloadMedia(id);
      }
    });
  }

  destroy() {
    if (this.mediaObserver) {
      this.mediaObserver.disconnect();
    }
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    this.activeMedia.clear();
  }
}

// Optimized scroll handler with throttling
export class ScrollOptimizer {
  private throttleMs = 16; // 60fps
  private lastScrollTime = 0;
  private scrollCallbacks = new Set<(scrollTop: number) => void>();
  private rafId: number | null = null;
  private isScrolling = false;
  private scrollEndTimeout: NodeJS.Timeout | null = null;

  addScrollListener(callback: (scrollTop: number) => void) {
    this.scrollCallbacks.add(callback);
  }

  removeScrollListener(callback: (scrollTop: number) => void) {
    this.scrollCallbacks.delete(callback);
  }

  handleScroll(scrollTop: number) {
    const now = Date.now();
    
    if (now - this.lastScrollTime < this.throttleMs) {
      return;
    }

    this.lastScrollTime = now;
    this.isScrolling = true;

    // Cancel previous animation frame
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }

    // Schedule update for next frame
    this.rafId = requestAnimationFrame(() => {
      this.scrollCallbacks.forEach(callback => callback(scrollTop));
    });

    // Set scroll end timeout
    if (this.scrollEndTimeout) {
      clearTimeout(this.scrollEndTimeout);
    }
    
    this.scrollEndTimeout = setTimeout(() => {
      this.isScrolling = false;
      this.onScrollEnd();
    }, 150);
  }

  private onScrollEnd() {
    // Perform cleanup or optimizations when scrolling ends
    console.log('📱 Scroll ended - performing cleanup');
  }

  isCurrentlyScrolling(): boolean {
    return this.isScrolling;
  }

  destroy() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
    
    if (this.scrollEndTimeout) {
      clearTimeout(this.scrollEndTimeout);
    }
    
    this.scrollCallbacks.clear();
  }
}

// React hook for optimized feed content
export function useOptimizedFeed(creatorUsername: string) {
  const [state, setState] = useState<OptimizedFeedState>({
    visibleItems: [],
    totalItems: 0,
    scrollOffset: 0,
    isLoading: false,
    hasMore: true,
    currentPage: 1
  });

  const contentLoader = useRef(new ContentLoader());
  const scrollOptimizer = useRef(new ScrollOptimizer());
  const mediaManager = useRef(new MediaManager());
  const containerRef = useRef<HTMLDivElement>(null);
  const allContent = useRef<ContentItem[]>([]);

  // Virtual scroll configuration
  const virtualScrollConfig: VirtualScrollConfig = useMemo(() => ({
    itemHeight: window.innerHeight, // Full viewport height per item
    overscan: 2,
    viewportHeight: window.innerHeight,
    bufferSize: 5
  }), []);

  const virtualScrollManager = useRef(new VirtualScrollManager(virtualScrollConfig, containerRef));

  // Load initial content
  useEffect(() => {
    if (!creatorUsername) return;

    const loadInitialContent = async () => {
      setState(prev => ({ ...prev, isLoading: true }));
      
      try {
        const content = await contentLoader.current.loadContent(creatorUsername, 1);
        allContent.current = content;
        
        const visibleItems = virtualScrollManager.current.getVisibleItems(content, 0);
        
        setState(prev => ({
          ...prev,
          visibleItems,
          totalItems: content.length,
          isLoading: false,
          hasMore: content.length >= 50
        }));
      } catch (error) {
        console.error('Failed to load initial content:', error);
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };

    loadInitialContent();
  }, [creatorUsername]);

  // Handle scroll events
  const handleScroll = useCallback((scrollTop: number) => {
    const visibleItems = virtualScrollManager.current.getVisibleItems(allContent.current, scrollTop);
    
    setState(prev => ({
      ...prev,
      visibleItems,
      scrollOffset: scrollTop
    }));

    // Preload content when near bottom
    const { itemHeight } = virtualScrollConfig;
    const totalHeight = virtualScrollManager.current.getTotalHeight(allContent.current.length);
    
    if (scrollTop + window.innerHeight > totalHeight - itemHeight * 3) {
      loadMoreContent();
    }
  }, [virtualScrollConfig]);

  // Load more content
  const loadMoreContent = useCallback(async () => {
    if (state.isLoading || !state.hasMore) return;

    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const nextPage = state.currentPage + 1;
      const newContent = await contentLoader.current.loadContent(creatorUsername, nextPage);
      
      if (newContent.length > 0) {
        allContent.current = [...allContent.current, ...newContent];
        
        const visibleItems = virtualScrollManager.current.getVisibleItems(
          allContent.current,
          state.scrollOffset
        );
        
        setState(prev => ({
          ...prev,
          visibleItems,
          totalItems: allContent.current.length,
          currentPage: nextPage,
          hasMore: newContent.length >= 50,
          isLoading: false
        }));
      } else {
        setState(prev => ({ ...prev, hasMore: false, isLoading: false }));
      }
    } catch (error) {
      console.error('Failed to load more content:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [creatorUsername, state.currentPage, state.isLoading, state.hasMore, state.scrollOffset]);

  // Initialize optimizers
  useEffect(() => {
    mediaManager.current.init();
    scrollOptimizer.current.addScrollListener(handleScroll);

    return () => {
      scrollOptimizer.current.removeScrollListener(handleScroll);
      scrollOptimizer.current.destroy();
      mediaManager.current.destroy();
      virtualScrollManager.current.cleanup();
    };
  }, [handleScroll]);

  // Preload content based on user behavior
  useEffect(() => {
    if (creatorUsername && state.currentPage > 0) {
      contentLoader.current.preloadContent(creatorUsername, state.currentPage);
    }
  }, [creatorUsername, state.currentPage]);

  return {
    ...state,
    containerRef,
    virtualScrollManager: virtualScrollManager.current,
    mediaManager: mediaManager.current,
    scrollOptimizer: scrollOptimizer.current,
    allContent: allContent.current,
    loadMoreContent
  };
}

// Performance monitoring for feed optimization
export class FeedPerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  private observer: PerformanceObserver | null = null;

  init() {
    this.setupPerformanceObserver();
    this.startMetricCollection();
  }

  private setupPerformanceObserver() {
    if ('PerformanceObserver' in window) {
      this.observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'measure') {
            this.recordMetric(entry.name, entry.duration);
          }
        });
      });
      
      this.observer.observe({ entryTypes: ['measure'] });
    }
  }

  private startMetricCollection() {
    // Track key performance metrics
    setInterval(() => {
      this.measureScrollPerformance();
      this.measureMemoryUsage();
      this.measureRenderTime();
    }, 5000);
  }

  private measureScrollPerformance() {
    performance.mark('scroll-start');
    // Measure scroll performance
    requestAnimationFrame(() => {
      performance.mark('scroll-end');
      performance.measure('scroll-performance', 'scroll-start', 'scroll-end');
    });
  }

  private measureMemoryUsage() {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.recordMetric('memory-usage', memory.usedJSHeapSize / 1024 / 1024); // MB
    }
  }

  private measureRenderTime() {
    performance.mark('render-start');
    requestAnimationFrame(() => {
      performance.mark('render-end');
      performance.measure('render-time', 'render-start', 'render-end');
    });
  }

  private recordMetric(name: string, value: number) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    const values = this.metrics.get(name)!;
    values.push(value);
    
    // Keep only last 100 values
    if (values.length > 100) {
      values.shift();
    }
  }

  getMetrics(): Record<string, { avg: number; min: number; max: number }> {
    const result: Record<string, { avg: number; min: number; max: number }> = {};
    
    this.metrics.forEach((values, name) => {
      const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
      const min = Math.min(...values);
      const max = Math.max(...values);
      
      result[name] = { avg, min, max };
    });
    
    return result;
  }

  destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
    this.metrics.clear();
  }
}

// Export singleton instances
export const feedPerformanceMonitor = new FeedPerformanceMonitor();