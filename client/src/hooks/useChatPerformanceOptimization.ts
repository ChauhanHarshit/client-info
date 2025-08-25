/**
 * Chat Performance Optimization Integration Hook
 * 
 * Main integration hook that combines all chat optimization features
 * into a single, easy-to-use interface for both /client-group-chats 
 * and /creator-app-layout Chat tab
 */

import { useCallback, useEffect, useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

// Import optimization systems
import { 
  useChatOptimization,
  useOptimisticChatUpdates,
  useChatPerformanceAnalytics,
  ChatPerformanceMonitor
} from '@/lib/chat-optimization';

import { 
  useChatDatabaseOptimization,
  useChatPagination 
} from '@/lib/chat-database-optimization';

import { 
  useChatRealtimeOptimization,
  TypingIndicator,
  ConnectionStatus 
} from '@/lib/chat-media-optimization';

// Types
interface ChatOptimizationConfig {
  // Virtual scrolling
  enableVirtualScrolling?: boolean;
  virtualScrollThreshold?: number;
  
  // Caching
  enableMessageCaching?: boolean;
  enableQueryBatching?: boolean;
  
  // Real-time updates
  enableRealTimeUpdates?: boolean;
  enablePresence?: boolean;
  enableTypingIndicators?: boolean;
  pollInterval?: number;
  
  // Media optimization
  enableMediaOptimization?: boolean;
  enableImagePreloading?: boolean;
  
  // Performance monitoring
  enablePerformanceTracking?: boolean;
  enableAnalytics?: boolean;
  
  // Pagination
  enablePagination?: boolean;
  pageSize?: number;
  
  // Optimistic updates
  enableOptimisticUpdates?: boolean;
}

interface ChatPerformanceData {
  messageCount: number;
  averageLoadTime: number;
  cacheHitRate: number;
  activeConnections: number;
  memoryUsage: number;
}

interface OptimizedChatMessage {
  id: number;
  content: string;
  senderId: number;
  createdAt: string;
  mediaUrl?: string;
  isOptimized?: boolean;
  isPending?: boolean;
  [key: string]: any;
}

/**
 * Main Chat Performance Optimization Hook
 * 
 * Provides comprehensive chat optimizations without changing 
 * existing site logic, functions, databases, or layouts
 */
export function useChatPerformanceOptimization(
  chatId: string | null,
  userId: string | null,
  config: ChatOptimizationConfig = {}
) {
  const queryClient = useQueryClient();
  
  // Default configuration
  const optimizationConfig = {
    enableVirtualScrolling: true,
    virtualScrollThreshold: 100,
    enableMessageCaching: true,
    enableQueryBatching: true,
    enableRealTimeUpdates: true,
    enablePresence: true,
    enableTypingIndicators: true,
    pollInterval: 2000,
    enableMediaOptimization: true,
    enableImagePreloading: true,
    enablePerformanceTracking: true,
    enableAnalytics: true,
    enablePagination: true,
    pageSize: 50,
    enableOptimisticUpdates: true,
    ...config
  };
  
  // Initialize optimization systems
  const chatOptimization = useChatOptimization(chatId, optimizationConfig);
  const databaseOptimization = useChatDatabaseOptimization(apiRequest);
  const realtimeOptimization = useChatRealtimeOptimization(chatId, userId, optimizationConfig);
  const optimisticUpdates = useOptimisticChatUpdates(chatId);
  const performanceAnalytics = useChatPerformanceAnalytics();
  const pagination = useChatPagination(chatId, optimizationConfig.pageSize);
  
  // State
  const [optimizedMessages, setOptimizedMessages] = useState<OptimizedChatMessage[]>([]);
  const [performanceData, setPerformanceData] = useState<ChatPerformanceData>({
    messageCount: 0,
    averageLoadTime: 0,
    cacheHitRate: 0,
    activeConnections: 0,
    memoryUsage: 0
  });
  
  // Performance monitor
  const performanceMonitor = useRef<ChatPerformanceMonitor | null>(null);
  
  // Initialize performance monitor
  useEffect(() => {
    if (optimizationConfig.enablePerformanceTracking && !performanceMonitor.current) {
      performanceMonitor.current = new ChatPerformanceMonitor();
    }
  }, [optimizationConfig.enablePerformanceTracking]);
  
  /**
   * Optimized message loading function
   */
  const loadOptimizedMessages = useCallback(async (targetChatId?: string) => {
    const activeChatId = targetChatId || chatId;
    if (!activeChatId) return [];
    
    performanceMonitor.current?.startTiming('message_load');
    
    try {
      // Try cache first
      let messages = optimizationConfig.enableMessageCaching 
        ? databaseOptimization.getOptimizedMessages({ chatId: activeChatId })
        : null;
      
      // If not in cache, fetch from API
      if (!messages) {
        messages = await databaseOptimization.getOptimizedMessages({ 
          chatId: activeChatId,
          limit: optimizationConfig.pageSize 
        });
      }
      
      // Apply optimizations
      const optimizedMessages = await chatOptimization.optimizeMessages(messages);
      
      // Merge with pending messages for optimistic updates
      const finalMessages = optimizationConfig.enableOptimisticUpdates
        ? [...optimizedMessages, ...optimisticUpdates.pendingMessages]
        : optimizedMessages;
      
      setOptimizedMessages(finalMessages);
      
      // Track performance
      if (optimizationConfig.enableAnalytics) {
        performanceAnalytics.trackEvent('messages_loaded', {
          chatId: activeChatId,
          count: finalMessages.length,
          cached: !!messages
        });
      }
      
      return finalMessages;
      
    } catch (error) {
      console.error('Optimized message loading failed:', error);
      return [];
    } finally {
      performanceMonitor.current?.endTiming('message_load');
    }
  }, [
    chatId, 
    optimizationConfig, 
    databaseOptimization, 
    chatOptimization, 
    optimisticUpdates.pendingMessages,
    performanceAnalytics
  ]);
  
  /**
   * Optimized message sending function
   */
  const sendOptimizedMessage = useCallback(async (
    content: string, 
    mediaFile?: File,
    messageType: 'text' | 'image' | 'video' = 'text'
  ) => {
    if (!chatId || !userId) return;
    
    performanceMonitor.current?.startTiming('message_send');
    
    try {
      // Create optimistic message
      if (optimizationConfig.enableOptimisticUpdates) {
        const optimisticMessage = {
          content,
          senderId: parseInt(userId),
          messageType,
          createdAt: new Date().toISOString(),
          mediaUrl: mediaFile ? URL.createObjectURL(mediaFile) : undefined
        };
        
        optimisticUpdates.addOptimisticMessage(optimisticMessage);
      }
      
      // Update activity for real-time optimization
      if (optimizationConfig.enableRealTimeUpdates) {
        realtimeOptimization.updateActivity();
      }
      
      // Send message via API
      const formData = new FormData();
      formData.append('content', content);
      formData.append('messageType', messageType);
      
      if (mediaFile) {
        formData.append('media', mediaFile);
      }
      
      const response = await apiRequest('POST', `/api/group-chats/${chatId}/messages`, formData);
      
      // Sync with real-time system
      if (optimizationConfig.enableRealTimeUpdates) {
        realtimeOptimization.sendMessageWithSync(response);
      }
      
      // Track performance
      if (optimizationConfig.enableAnalytics) {
        performanceAnalytics.trackEvent('message_sent', {
          chatId,
          type: messageType,
          hasMedia: !!mediaFile
        });
      }
      
      // Refresh messages
      await loadOptimizedMessages();
      
      return response;
      
    } catch (error) {
      console.error('Optimized message sending failed:', error);
      throw error;
    } finally {
      performanceMonitor.current?.endTiming('message_send');
    }
  }, [
    chatId, 
    userId, 
    optimizationConfig, 
    optimisticUpdates, 
    realtimeOptimization,
    performanceAnalytics,
    loadOptimizedMessages
  ]);
  
  /**
   * Optimized chat list loading
   */
  const loadOptimizedChatList = useCallback(async (options?: { includeArchived?: boolean }) => {
    if (!userId) return [];
    
    performanceMonitor.current?.startTiming('chat_list_load');
    
    try {
      const chatList = await databaseOptimization.getOptimizedChatList(userId, options);
      
      // Prefetch messages for first few chats
      if (optimizationConfig.enableMessageCaching) {
        chatList.slice(0, 3).forEach(chat => {
          databaseOptimization.prefetchMessages(chat.id.toString());
        });
      }
      
      // Track performance
      if (optimizationConfig.enableAnalytics) {
        performanceAnalytics.trackEvent('chat_list_loaded', {
          count: chatList.length
        });
      }
      
      return chatList;
      
    } catch (error) {
      console.error('Optimized chat list loading failed:', error);
      return [];
    } finally {
      performanceMonitor.current?.endTiming('chat_list_load');
    }
  }, [userId, optimizationConfig, databaseOptimization, performanceAnalytics]);
  
  /**
   * Set typing indicator
   */
  const setTypingIndicator = useCallback((isTyping: boolean) => {
    if (optimizationConfig.enableTypingIndicators) {
      realtimeOptimization.setTyping(isTyping);
    }
  }, [optimizationConfig.enableTypingIndicators, realtimeOptimization]);
  
  /**
   * Load more messages (pagination)
   */
  const loadMoreMessages = useCallback(async () => {
    if (!optimizationConfig.enablePagination) return [];
    
    return await pagination.loadNextPage();
  }, [optimizationConfig.enablePagination, pagination]);
  
  /**
   * Initialize virtual scrolling
   */
  const initializeVirtualScroll = useCallback((container: HTMLElement) => {
    if (optimizationConfig.enableVirtualScrolling) {
      chatOptimization.initializeVirtualScroll(container, optimizedMessages.length);
    }
  }, [optimizationConfig.enableVirtualScrolling, chatOptimization, optimizedMessages.length]);
  
  /**
   * Get virtual scroll data
   */
  const getVirtualScrollData = useCallback(() => {
    if (!optimizationConfig.enableVirtualScrolling) {
      return { visibleMessages: optimizedMessages, scrollOffset: 0 };
    }
    
    return chatOptimization.getVirtualScrollData(optimizedMessages);
  }, [optimizationConfig.enableVirtualScrolling, chatOptimization, optimizedMessages]);
  
  /**
   * Update performance data
   */
  const updatePerformanceData = useCallback(() => {
    if (!optimizationConfig.enablePerformanceTracking) return;
    
    const metrics = chatOptimization.getPerformanceMetrics();
    const analytics = performanceAnalytics.getAnalytics();
    
    setPerformanceData({
      messageCount: optimizedMessages.length,
      averageLoadTime: metrics.message_load?.avg || 0,
      cacheHitRate: analytics.cache_hit_rate || 0,
      activeConnections: realtimeOptimization.pollingManager?.getActivePollsCount() || 0,
      memoryUsage: (performance as any).memory?.usedJSHeapSize || 0
    });
  }, [
    optimizationConfig.enablePerformanceTracking,
    chatOptimization,
    performanceAnalytics,
    optimizedMessages.length,
    realtimeOptimization
  ]);
  
  // Update performance data periodically
  useEffect(() => {
    if (optimizationConfig.enablePerformanceTracking) {
      const interval = setInterval(updatePerformanceData, 5000);
      return () => clearInterval(interval);
    }
  }, [optimizationConfig.enablePerformanceTracking, updatePerformanceData]);
  
  // Load messages when chat changes
  useEffect(() => {
    if (chatId) {
      loadOptimizedMessages();
    }
  }, [chatId, loadOptimizedMessages]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (optimizationConfig.enableMessageCaching) {
        databaseOptimization.clearAllCache();
      }
    };
  }, [optimizationConfig.enableMessageCaching, databaseOptimization]);
  
  return {
    // Core functionality
    messages: optimizedMessages,
    loadMessages: loadOptimizedMessages,
    sendMessage: sendOptimizedMessage,
    loadChatList: loadOptimizedChatList,
    
    // Virtual scrolling
    initializeVirtualScroll,
    getVirtualScrollData,
    isVirtualScrollEnabled: optimizationConfig.enableVirtualScrolling,
    
    // Real-time features
    connectionState: realtimeOptimization.connectionState,
    typingUsers: realtimeOptimization.typingUsers,
    setTypingIndicator,
    
    // Pagination
    loadMoreMessages,
    hasNextPage: pagination.hasNextPage,
    isLoadingMore: pagination.isLoading,
    
    // Performance
    performanceData,
    isOptimizing: chatOptimization.isOptimizing,
    
    // Cache management
    invalidateCache: () => databaseOptimization.invalidateChatCache(chatId || ''),
    clearCache: databaseOptimization.clearAllCache,
    
    // Analytics
    getAnalytics: performanceAnalytics.getAnalytics,
    trackEvent: performanceAnalytics.trackEvent,
    
    // Configuration
    config: optimizationConfig,
    
    // Components
    TypingIndicator,
    ConnectionStatus,
    
    // Advanced access to optimization systems
    optimizationSystems: {
      chatOptimization,
      databaseOptimization,
      realtimeOptimization,
      optimisticUpdates,
      performanceAnalytics,
      pagination
    }
  };
}

/**
 * Simplified Chat Optimization Hook
 * For basic optimization needs
 */
export function useBasicChatOptimization(chatId: string | null, userId: string | null) {
  return useChatPerformanceOptimization(chatId, userId, {
    enableVirtualScrolling: false,
    enablePresence: false,
    enableTypingIndicators: false,
    enableAnalytics: false,
    enablePagination: false,
    enableOptimisticUpdates: false
  });
}

/**
 * Advanced Chat Optimization Hook
 * For full optimization features
 */
export function useAdvancedChatOptimization(chatId: string | null, userId: string | null) {
  return useChatPerformanceOptimization(chatId, userId, {
    enableVirtualScrolling: true,
    virtualScrollThreshold: 50,
    enableMessageCaching: true,
    enableQueryBatching: true,
    enableRealTimeUpdates: true,
    enablePresence: true,
    enableTypingIndicators: true,
    pollInterval: 1000,
    enableMediaOptimization: true,
    enableImagePreloading: true,
    enablePerformanceTracking: true,
    enableAnalytics: true,
    enablePagination: true,
    pageSize: 100,
    enableOptimisticUpdates: true
  });
}

/**
 * Creator Chat Optimization Hook
 * Optimized for /creator-app-layout Chat tab
 */
export function useCreatorChatOptimization(creatorId: string | null) {
  return useChatPerformanceOptimization(null, creatorId, {
    enableVirtualScrolling: true,
    virtualScrollThreshold: 30,
    enableMessageCaching: true,
    enableRealTimeUpdates: true,
    enablePresence: true,
    enableTypingIndicators: true,
    pollInterval: 1500,
    enableMediaOptimization: true,
    enableOptimisticUpdates: true,
    pageSize: 30
  });
}

/**
 * Admin Chat Optimization Hook
 * Optimized for /client-group-chats admin interface
 */
export function useAdminChatOptimization(userId: string | null) {
  return useChatPerformanceOptimization(null, userId, {
    enableVirtualScrolling: true,
    virtualScrollThreshold: 100,
    enableMessageCaching: true,
    enableQueryBatching: true,
    enableRealTimeUpdates: true,
    enablePresence: true,
    enableTypingIndicators: true,
    pollInterval: 2000,
    enableMediaOptimization: true,
    enablePerformanceTracking: true,
    enableAnalytics: true,
    enablePagination: true,
    pageSize: 50,
    enableOptimisticUpdates: true
  });
}

/**
 * Export types and utilities
 */
export type {
  ChatOptimizationConfig,
  ChatPerformanceData,
  OptimizedChatMessage
};