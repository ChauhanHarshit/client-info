/**
 * Chat Performance Optimization System
 * 
 * Comprehensive performance enhancements for both /client-group-chats and 
 * /creator-app-layout Chat tab without affecting existing site logic, 
 * functions, databases, or layouts.
 */

import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';

// Types for chat optimization
interface ChatMessage {
  id: number;
  content: string;
  senderId: number;
  createdAt: string;
  mediaUrl?: string;
  [key: string]: any;
}

interface ChatOptimizationConfig {
  enableVirtualScrolling?: boolean;
  enableMessageCaching?: boolean;
  enableRealTimeUpdates?: boolean;
  enableMediaOptimization?: boolean;
  messageBufferSize?: number;
  virtualScrollThreshold?: number;
}

/**
 * Virtual Scrolling Manager for Chat Messages
 * Optimizes DOM rendering for large chat histories
 */
export class ChatVirtualScrollManager {
  private container: HTMLElement | null = null;
  private itemHeight: number = 80; // Average message height
  private bufferSize: number = 5;
  private visibleRange: { start: number; end: number } = { start: 0, end: 0 };
  private scrollTop: number = 0;
  private totalHeight: number = 0;
  
  constructor(config?: { itemHeight?: number; bufferSize?: number }) {
    this.itemHeight = config?.itemHeight || 80;
    this.bufferSize = config?.bufferSize || 5;
  }
  
  initialize(container: HTMLElement, totalItems: number) {
    this.container = container;
    this.totalHeight = totalItems * this.itemHeight;
    this.updateVisibleRange();
    
    // Add scroll listener with throttling
    if (this.container) {
      this.container.addEventListener('scroll', this.throttledScrollHandler);
    }
  }
  
  private throttledScrollHandler = this.throttle(() => {
    this.updateVisibleRange();
  }, 16); // 60fps throttling
  
  private updateVisibleRange() {
    if (!this.container) return;
    
    const containerHeight = this.container.clientHeight;
    this.scrollTop = this.container.scrollTop;
    
    const startIndex = Math.floor(this.scrollTop / this.itemHeight);
    const endIndex = Math.ceil((this.scrollTop + containerHeight) / this.itemHeight);
    
    this.visibleRange = {
      start: Math.max(0, startIndex - this.bufferSize),
      end: Math.min(endIndex + this.bufferSize, Math.floor(this.totalHeight / this.itemHeight))
    };
  }
  
  getVisibleRange() {
    return this.visibleRange;
  }
  
  getScrollOffset() {
    return this.visibleRange.start * this.itemHeight;
  }
  
  private throttle(func: Function, delay: number) {
    let timeoutId: NodeJS.Timeout;
    let lastExecTime = 0;
    
    return function (...args: any[]) {
      const currentTime = Date.now();
      
      if (currentTime - lastExecTime > delay) {
        func.apply(this, args);
        lastExecTime = currentTime;
      } else {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          func.apply(this, args);
          lastExecTime = Date.now();
        }, delay - (currentTime - lastExecTime));
      }
    };
  }
  
  destroy() {
    if (this.container) {
      this.container.removeEventListener('scroll', this.throttledScrollHandler);
    }
  }
}

/**
 * Message Caching System
 * Intelligent caching for chat messages and media
 */
export class ChatMessageCache {
  private messageCache = new Map<string, ChatMessage[]>();
  private mediaCache = new Map<string, string>();
  private cacheSize = 100; // Maximum cached chats
  private maxAge = 5 * 60 * 1000; // 5 minutes
  
  constructor(config?: { cacheSize?: number; maxAge?: number }) {
    this.cacheSize = config?.cacheSize || 100;
    this.maxAge = config?.maxAge || 5 * 60 * 1000;
  }
  
  setMessages(chatId: string, messages: ChatMessage[]) {
    this.messageCache.set(chatId, {
      ...messages,
      timestamp: Date.now()
    } as any);
    
    // Cleanup old cache entries
    this.cleanup();
  }
  
  getMessages(chatId: string): ChatMessage[] | null {
    const cached = this.messageCache.get(chatId) as any;
    if (!cached) return null;
    
    // Check if cache is still valid
    if (Date.now() - cached.timestamp > this.maxAge) {
      this.messageCache.delete(chatId);
      return null;
    }
    
    return cached;
  }
  
  cacheMedia(url: string, blob: string) {
    this.mediaCache.set(url, blob);
  }
  
  getMedia(url: string): string | null {
    return this.mediaCache.get(url) || null;
  }
  
  private cleanup() {
    if (this.messageCache.size <= this.cacheSize) return;
    
    // Remove oldest entries
    const entries = Array.from(this.messageCache.entries());
    entries.sort((a, b) => (a[1] as any).timestamp - (b[1] as any).timestamp);
    
    // Keep only the most recent entries
    const toKeep = entries.slice(-this.cacheSize);
    this.messageCache.clear();
    
    toKeep.forEach(([key, value]) => {
      this.messageCache.set(key, value);
    });
  }
  
  clear() {
    this.messageCache.clear();
    this.mediaCache.clear();
  }
}

/**
 * Real-time Update Manager
 * Optimizes real-time chat updates without WebSocket changes
 */
export class ChatRealtimeManager {
  private updateInterval: NodeJS.Timeout | null = null;
  private queryClient: any;
  private activeChatIds = new Set<string>();
  private updateFrequency = 2000; // 2 seconds
  
  constructor(queryClient: any, config?: { updateFrequency?: number }) {
    this.queryClient = queryClient;
    this.updateFrequency = config?.updateFrequency || 2000;
  }
  
  startPolling(chatId: string) {
    this.activeChatIds.add(chatId);
    
    if (!this.updateInterval) {
      this.updateInterval = setInterval(() => {
        this.updateActiveChats();
      }, this.updateFrequency);
    }
  }
  
  stopPolling(chatId: string) {
    this.activeChatIds.delete(chatId);
    
    if (this.activeChatIds.size === 0 && this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }
  
  private updateActiveChats() {
    this.activeChatIds.forEach(chatId => {
      // Invalidate queries for active chats to trigger fresh data fetch
      this.queryClient.invalidateQueries({ 
        queryKey: [`/api/group-chats/${chatId}/messages`] 
      });
    });
  }
  
  destroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    this.activeChatIds.clear();
  }
}

/**
 * Media Optimization Manager
 * Handles image/video loading optimization
 */
export class ChatMediaOptimizer {
  private imageCache = new Map<string, HTMLImageElement>();
  private videoCache = new Map<string, HTMLVideoElement>();
  private loadingQueue = new Set<string>();
  private maxConcurrentLoads = 3;
  
  constructor(config?: { maxConcurrentLoads?: number }) {
    this.maxConcurrentLoads = config?.maxConcurrentLoads || 3;
  }
  
  preloadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      // Check cache first
      if (this.imageCache.has(url)) {
        resolve(this.imageCache.get(url)!);
        return;
      }
      
      // Check if already loading
      if (this.loadingQueue.has(url)) {
        // Wait for existing load to complete
        const checkInterval = setInterval(() => {
          if (this.imageCache.has(url)) {
            clearInterval(checkInterval);
            resolve(this.imageCache.get(url)!);
          }
        }, 100);
        return;
      }
      
      // Limit concurrent loads
      if (this.loadingQueue.size >= this.maxConcurrentLoads) {
        setTimeout(() => this.preloadImage(url).then(resolve).catch(reject), 100);
        return;
      }
      
      this.loadingQueue.add(url);
      
      const img = new Image();
      img.onload = () => {
        this.imageCache.set(url, img);
        this.loadingQueue.delete(url);
        resolve(img);
      };
      img.onerror = () => {
        this.loadingQueue.delete(url);
        reject(new Error(`Failed to load image: ${url}`));
      };
      img.src = url;
    });
  }
  
  preloadVideo(url: string): Promise<HTMLVideoElement> {
    return new Promise((resolve, reject) => {
      if (this.videoCache.has(url)) {
        resolve(this.videoCache.get(url)!);
        return;
      }
      
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        this.videoCache.set(url, video);
        resolve(video);
      };
      video.onerror = () => {
        reject(new Error(`Failed to load video: ${url}`));
      };
      video.src = url;
    });
  }
  
  optimizeImageUrl(url: string, maxWidth?: number): string {
    // For future CDN integration or dynamic resizing
    if (maxWidth) {
      return `${url}?w=${maxWidth}&q=80`;
    }
    return url;
  }
  
  clearCache() {
    this.imageCache.clear();
    this.videoCache.clear();
  }
}

/**
 * Performance Monitoring for Chat Operations
 */
export class ChatPerformanceMonitor {
  private metrics = new Map<string, number[]>();
  private startTimes = new Map<string, number>();
  
  startTiming(operation: string) {
    this.startTimes.set(operation, performance.now());
  }
  
  endTiming(operation: string) {
    const startTime = this.startTimes.get(operation);
    if (startTime) {
      const duration = performance.now() - startTime;
      
      if (!this.metrics.has(operation)) {
        this.metrics.set(operation, []);
      }
      
      const operations = this.metrics.get(operation)!;
      operations.push(duration);
      
      // Keep only last 100 measurements
      if (operations.length > 100) {
        operations.shift();
      }
      
      this.startTimes.delete(operation);
      
      // Log slow operations
      if (duration > 1000) {
        console.warn(`🐌 Slow chat operation: ${operation} took ${duration.toFixed(2)}ms`);
      }
    }
  }
  
  getMetrics() {
    const result: Record<string, { avg: number; min: number; max: number; count: number }> = {};
    
    this.metrics.forEach((durations, operation) => {
      const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
      const min = Math.min(...durations);
      const max = Math.max(...durations);
      
      result[operation] = {
        avg: Math.round(avg * 100) / 100,
        min: Math.round(min * 100) / 100,
        max: Math.round(max * 100) / 100,
        count: durations.length
      };
    });
    
    return result;
  }
}

/**
 * Main Chat Optimization Hook
 * Integrates all optimization features
 */
export function useChatOptimization(
  chatId: string | null,
  config?: ChatOptimizationConfig
) {
  const queryClient = useQueryClient();
  const {
    enableVirtualScrolling = true,
    enableMessageCaching = true,
    enableRealTimeUpdates = true,
    enableMediaOptimization = true,
    messageBufferSize = 50,
    virtualScrollThreshold = 100
  } = config || {};
  
  // Initialize optimization managers
  const virtualScrollManager = useRef<ChatVirtualScrollManager | null>(null);
  const messageCache = useRef<ChatMessageCache | null>(null);
  const realtimeManager = useRef<ChatRealtimeManager | null>(null);
  const mediaOptimizer = useRef<ChatMediaOptimizer | null>(null);
  const performanceMonitor = useRef<ChatPerformanceMonitor | null>(null);
  
  // State for optimized messages
  const [optimizedMessages, setOptimizedMessages] = useState<ChatMessage[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  
  // Initialize managers
  useEffect(() => {
    if (enableVirtualScrolling && !virtualScrollManager.current) {
      virtualScrollManager.current = new ChatVirtualScrollManager({
        itemHeight: 80,
        bufferSize: 5
      });
    }
    
    if (enableMessageCaching && !messageCache.current) {
      messageCache.current = new ChatMessageCache({
        cacheSize: 100,
        maxAge: 5 * 60 * 1000
      });
    }
    
    if (enableRealTimeUpdates && !realtimeManager.current) {
      realtimeManager.current = new ChatRealtimeManager(queryClient, {
        updateFrequency: 2000
      });
    }
    
    if (enableMediaOptimization && !mediaOptimizer.current) {
      mediaOptimizer.current = new ChatMediaOptimizer({
        maxConcurrentLoads: 3
      });
    }
    
    if (!performanceMonitor.current) {
      performanceMonitor.current = new ChatPerformanceMonitor();
    }
  }, [enableVirtualScrolling, enableMessageCaching, enableRealTimeUpdates, enableMediaOptimization, queryClient]);
  
  // Start real-time updates for active chat
  useEffect(() => {
    if (chatId && enableRealTimeUpdates && realtimeManager.current) {
      realtimeManager.current.startPolling(chatId);
      
      return () => {
        realtimeManager.current?.stopPolling(chatId);
      };
    }
  }, [chatId, enableRealTimeUpdates]);
  
  // Optimize messages function
  const optimizeMessages = useCallback(async (messages: ChatMessage[]) => {
    if (!enableMessageCaching || !messageCache.current || !chatId) return messages;
    
    setIsOptimizing(true);
    performanceMonitor.current?.startTiming('message_optimization');
    
    try {
      // Cache messages
      messageCache.current.setMessages(chatId, messages);
      
      // Preload media if enabled
      if (enableMediaOptimization && mediaOptimizer.current) {
        const mediaUrls = messages
          .filter(msg => msg.mediaUrl)
          .map(msg => msg.mediaUrl!)
          .slice(0, 10); // Limit to first 10 media items
        
        // Preload images asynchronously
        mediaUrls.forEach(url => {
          if (url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
            mediaOptimizer.current?.preloadImage(url).catch(console.error);
          } else if (url.match(/\.(mp4|mov|webm)$/i)) {
            mediaOptimizer.current?.preloadVideo(url).catch(console.error);
          }
        });
      }
      
      setOptimizedMessages(messages);
      return messages;
    } finally {
      performanceMonitor.current?.endTiming('message_optimization');
      setIsOptimizing(false);
    }
  }, [chatId, enableMessageCaching, enableMediaOptimization]);
  
  // Virtual scroll utilities
  const getVirtualScrollData = useCallback((messages: ChatMessage[]) => {
    if (!enableVirtualScrolling || !virtualScrollManager.current || messages.length < virtualScrollThreshold) {
      return { visibleMessages: messages, scrollOffset: 0 };
    }
    
    const { start, end } = virtualScrollManager.current.getVisibleRange();
    const visibleMessages = messages.slice(start, end);
    const scrollOffset = virtualScrollManager.current.getScrollOffset();
    
    return { visibleMessages, scrollOffset };
  }, [enableVirtualScrolling, virtualScrollThreshold]);
  
  // Initialize virtual scroll container
  const initializeVirtualScroll = useCallback((container: HTMLElement, messageCount: number) => {
    if (enableVirtualScrolling && virtualScrollManager.current) {
      virtualScrollManager.current.initialize(container, messageCount);
    }
  }, [enableVirtualScrolling]);
  
  // Get cached messages
  const getCachedMessages = useCallback((targetChatId: string) => {
    if (enableMessageCaching && messageCache.current) {
      return messageCache.current.getMessages(targetChatId);
    }
    return null;
  }, [enableMessageCaching]);
  
  // Performance metrics
  const getPerformanceMetrics = useCallback(() => {
    return performanceMonitor.current?.getMetrics() || {};
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      virtualScrollManager.current?.destroy();
      realtimeManager.current?.destroy();
      mediaOptimizer.current?.clearCache();
    };
  }, []);
  
  return {
    // Optimization functions
    optimizeMessages,
    getCachedMessages,
    getVirtualScrollData,
    initializeVirtualScroll,
    
    // State
    optimizedMessages,
    isOptimizing,
    
    // Performance
    getPerformanceMetrics,
    
    // Managers (for advanced usage)
    virtualScrollManager: virtualScrollManager.current,
    messageCache: messageCache.current,
    mediaOptimizer: mediaOptimizer.current,
    
    // Config
    isVirtualScrollEnabled: enableVirtualScrolling,
    isCachingEnabled: enableMessageCaching,
    isRealTimeEnabled: enableRealTimeUpdates,
    isMediaOptimizationEnabled: enableMediaOptimization,
  };
}

/**
 * Optimistic Updates Hook
 * Provides instant UI updates before server confirmation
 */
export function useOptimisticChatUpdates(chatId: string | null) {
  const queryClient = useQueryClient();
  const [pendingMessages, setPendingMessages] = useState<ChatMessage[]>([]);
  
  const addOptimisticMessage = useCallback((message: Omit<ChatMessage, 'id'>) => {
    if (!chatId) return;
    
    const optimisticMessage: ChatMessage = {
      ...message,
      id: Date.now(), // Temporary ID
      createdAt: new Date().toISOString(),
      isPending: true, // Mark as pending
    } as any;
    
    setPendingMessages(prev => [...prev, optimisticMessage]);
    
    // Remove pending message after 10 seconds (fallback)
    setTimeout(() => {
      setPendingMessages(prev => 
        prev.filter(msg => msg.id !== optimisticMessage.id)
      );
    }, 10000);
  }, [chatId]);
  
  const confirmOptimisticMessage = useCallback((tempId: number, confirmedMessage: ChatMessage) => {
    setPendingMessages(prev => 
      prev.filter(msg => msg.id !== tempId)
    );
    
    // Invalidate queries to get fresh data
    if (chatId) {
      queryClient.invalidateQueries({ 
        queryKey: [`/api/group-chats/${chatId}/messages`] 
      });
    }
  }, [chatId, queryClient]);
  
  const retryFailedMessage = useCallback((tempId: number) => {
    // Implementation for retry logic
    console.log('Retrying message:', tempId);
  }, []);
  
  return {
    pendingMessages,
    addOptimisticMessage,
    confirmOptimisticMessage,
    retryFailedMessage,
  };
}

/**
 * Chat Performance Analytics
 * Tracks chat system performance metrics
 */
export function useChatPerformanceAnalytics() {
  const [metrics, setMetrics] = useState<Record<string, any>>({});
  
  const trackEvent = useCallback((event: string, data?: any) => {
    const timestamp = Date.now();
    setMetrics(prev => ({
      ...prev,
      [event]: {
        ...prev[event],
        count: (prev[event]?.count || 0) + 1,
        lastOccurrence: timestamp,
        data: data || {}
      }
    }));
  }, []);
  
  const getAnalytics = useCallback(() => {
    return {
      totalEvents: Object.values(metrics).reduce((acc: number, metric: any) => acc + metric.count, 0),
      eventBreakdown: metrics,
      timestamp: Date.now()
    };
  }, [metrics]);
  
  return {
    trackEvent,
    getAnalytics,
    metrics
  };
}

/**
 * Export all optimization utilities
 */
export {
  ChatVirtualScrollManager,
  ChatMessageCache,
  ChatRealtimeManager,
  ChatMediaOptimizer,
  ChatPerformanceMonitor
};