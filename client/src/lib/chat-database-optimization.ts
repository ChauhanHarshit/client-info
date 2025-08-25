/**
 * Chat Database Optimization Layer
 * 
 * Optimizes database queries and caching for chat operations
 * without changing existing database schema or API logic
 */

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState, useEffect } from 'react';

// Types
interface ChatQueryOptions {
  chatId: string;
  limit?: number;
  offset?: number;
  before?: string;
  after?: string;
}

interface DatabaseCacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

/**
 * Query Optimization Manager
 * Optimizes database queries with intelligent caching and batching
 */
export class ChatQueryOptimizer {
  private queryCache = new Map<string, DatabaseCacheEntry>();
  private pendingQueries = new Map<string, Promise<any>>();
  private batchedQueries = new Map<string, any[]>();
  private batchTimeout: NodeJS.Timeout | null = null;
  private readonly DEFAULT_TTL = 30000; // 30 seconds
  private readonly BATCH_DELAY = 100; // 100ms batch delay
  
  constructor(private apiRequest: (method: string, url: string, body?: any) => Promise<any>) {}
  
  /**
   * Optimized message fetching with caching
   */
  async getMessages(options: ChatQueryOptions): Promise<any[]> {
    const cacheKey = this.getCacheKey('messages', options);
    
    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Check if query is already pending
    if (this.pendingQueries.has(cacheKey)) {
      return this.pendingQueries.get(cacheKey)!;
    }
    
    // Create new query
    const queryPromise = this.executeMessageQuery(options);
    this.pendingQueries.set(cacheKey, queryPromise);
    
    try {
      const result = await queryPromise;
      this.setCache(cacheKey, result, this.DEFAULT_TTL);
      return result;
    } finally {
      this.pendingQueries.delete(cacheKey);
    }
  }
  
  /**
   * Batch multiple queries for efficiency
   */
  async batchGetMessages(queries: ChatQueryOptions[]): Promise<any[][]> {
    const results: Promise<any[]>[] = [];
    
    for (const query of queries) {
      results.push(this.getMessages(query));
    }
    
    return Promise.all(results);
  }
  
  /**
   * Optimized chat list fetching
   */
  async getChatList(userId: string, options?: { limit?: number; includeArchived?: boolean }): Promise<any[]> {
    const cacheKey = this.getCacheKey('chatList', { userId, ...options });
    
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }
    
    if (this.pendingQueries.has(cacheKey)) {
      return this.pendingQueries.get(cacheKey)!;
    }
    
    const queryPromise = this.executeChatListQuery(userId, options);
    this.pendingQueries.set(cacheKey, queryPromise);
    
    try {
      const result = await queryPromise;
      this.setCache(cacheKey, result, this.DEFAULT_TTL);
      return result;
    } finally {
      this.pendingQueries.delete(cacheKey);
    }
  }
  
  /**
   * Prefetch messages for better UX
   */
  async prefetchMessages(chatId: string, options?: { limit?: number }): Promise<void> {
    const queryOptions: ChatQueryOptions = {
      chatId,
      limit: options?.limit || 50
    };
    
    // Prefetch in background, don't wait for result
    this.getMessages(queryOptions).catch(console.error);
  }
  
  /**
   * Invalidate cache for specific chat
   */
  invalidateChatCache(chatId: string): void {
    const keysToRemove: string[] = [];
    
    this.queryCache.forEach((_, key) => {
      if (key.includes(chatId)) {
        keysToRemove.push(key);
      }
    });
    
    keysToRemove.forEach(key => {
      this.queryCache.delete(key);
    });
  }
  
  /**
   * Clear all cache
   */
  clearCache(): void {
    this.queryCache.clear();
    this.pendingQueries.clear();
  }
  
  private async executeMessageQuery(options: ChatQueryOptions): Promise<any[]> {
    const { chatId, limit = 50, offset = 0 } = options;
    
    const response = await this.apiRequest(
      'GET',
      `/api/group-chats/${chatId}/messages?limit=${limit}&offset=${offset}`
    );
    
    return response;
  }
  
  private async executeChatListQuery(userId: string, options?: any): Promise<any[]> {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.includeArchived) params.append('includeArchived', 'true');
    
    const response = await this.apiRequest(
      'GET',
      `/api/group-chats?${params.toString()}`
    );
    
    return response;
  }
  
  private getCacheKey(type: string, options: any): string {
    return `${type}:${JSON.stringify(options)}`;
  }
  
  private getFromCache(key: string): any | null {
    const entry = this.queryCache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.queryCache.delete(key);
      return null;
    }
    
    return entry.data;
  }
  
  private setCache(key: string, data: any, ttl: number): void {
    this.queryCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
    
    // Cleanup old entries periodically
    if (this.queryCache.size > 100) {
      this.cleanupCache();
    }
  }
  
  private cleanupCache(): void {
    const now = Date.now();
    const keysToRemove: string[] = [];
    
    this.queryCache.forEach((entry, key) => {
      if (now - entry.timestamp > entry.ttl) {
        keysToRemove.push(key);
      }
    });
    
    keysToRemove.forEach(key => {
      this.queryCache.delete(key);
    });
  }
}

/**
 * Request Batching Manager
 * Batches multiple API requests for better performance
 */
export class ChatRequestBatcher {
  private batchQueue = new Map<string, any[]>();
  private batchTimeout: NodeJS.Timeout | null = null;
  private readonly BATCH_DELAY = 50; // 50ms batch delay
  
  constructor(private apiRequest: (method: string, url: string, body?: any) => Promise<any>) {}
  
  /**
   * Add request to batch
   */
  async batchRequest(type: string, request: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.batchQueue.has(type)) {
        this.batchQueue.set(type, []);
      }
      
      this.batchQueue.get(type)!.push({
        request,
        resolve,
        reject
      });
      
      this.scheduleBatch();
    });
  }
  
  private scheduleBatch(): void {
    if (this.batchTimeout) return;
    
    this.batchTimeout = setTimeout(() => {
      this.executeBatch();
      this.batchTimeout = null;
    }, this.BATCH_DELAY);
  }
  
  private async executeBatch(): Promise<void> {
    const batches = Array.from(this.batchQueue.entries());
    this.batchQueue.clear();
    
    for (const [type, requests] of batches) {
      try {
        const results = await this.executeBatchType(type, requests);
        
        requests.forEach((req, index) => {
          req.resolve(results[index]);
        });
      } catch (error) {
        requests.forEach(req => {
          req.reject(error);
        });
      }
    }
  }
  
  private async executeBatchType(type: string, requests: any[]): Promise<any[]> {
    switch (type) {
      case 'messages':
        return this.batchMessages(requests);
      case 'members':
        return this.batchMembers(requests);
      default:
        throw new Error(`Unknown batch type: ${type}`);
    }
  }
  
  private async batchMessages(requests: any[]): Promise<any[]> {
    const chatIds = requests.map(req => req.request.chatId);
    const response = await this.apiRequest('POST', '/api/batch/messages', { chatIds });
    return response;
  }
  
  private async batchMembers(requests: any[]): Promise<any[]> {
    const chatIds = requests.map(req => req.request.chatId);
    const response = await this.apiRequest('POST', '/api/batch/members', { chatIds });
    return response;
  }
}

/**
 * Data Synchronization Manager
 * Handles optimistic updates and conflict resolution
 */
export class ChatDataSyncManager {
  private pendingUpdates = new Map<string, any>();
  private conflictResolver: ((local: any, remote: any) => any) | null = null;
  
  constructor(private queryClient: any) {}
  
  /**
   * Apply optimistic update
   */
  applyOptimisticUpdate(queryKey: string[], updateFn: (oldData: any) => any): void {
    const key = JSON.stringify(queryKey);
    
    // Store current data for potential rollback
    const currentData = this.queryClient.getQueryData(queryKey);
    this.pendingUpdates.set(key, currentData);
    
    // Apply optimistic update
    this.queryClient.setQueryData(queryKey, updateFn);
  }
  
  /**
   * Confirm optimistic update
   */
  confirmOptimisticUpdate(queryKey: string[]): void {
    const key = JSON.stringify(queryKey);
    this.pendingUpdates.delete(key);
  }
  
  /**
   * Rollback optimistic update
   */
  rollbackOptimisticUpdate(queryKey: string[]): void {
    const key = JSON.stringify(queryKey);
    const originalData = this.pendingUpdates.get(key);
    
    if (originalData !== undefined) {
      this.queryClient.setQueryData(queryKey, originalData);
      this.pendingUpdates.delete(key);
    }
  }
  
  /**
   * Sync with server data
   */
  async syncWithServer(queryKey: string[]): Promise<void> {
    try {
      await this.queryClient.invalidateQueries({ queryKey });
      this.confirmOptimisticUpdate(queryKey);
    } catch (error) {
      this.rollbackOptimisticUpdate(queryKey);
      throw error;
    }
  }
  
  /**
   * Set conflict resolver
   */
  setConflictResolver(resolver: (local: any, remote: any) => any): void {
    this.conflictResolver = resolver;
  }
  
  /**
   * Resolve conflicts between local and remote data
   */
  resolveConflict(local: any, remote: any): any {
    if (this.conflictResolver) {
      return this.conflictResolver(local, remote);
    }
    
    // Default: prefer remote data
    return remote;
  }
}

/**
 * Chat Database Optimization Hook
 * Main hook for database optimization features
 */
export function useChatDatabaseOptimization(apiRequest: (method: string, url: string, body?: any) => Promise<any>) {
  const queryClient = useQueryClient();
  
  // Initialize managers
  const queryOptimizer = useRef<ChatQueryOptimizer | null>(null);
  const requestBatcher = useRef<ChatRequestBatcher | null>(null);
  const dataSyncManager = useRef<ChatDataSyncManager | null>(null);
  
  useEffect(() => {
    if (!queryOptimizer.current) {
      queryOptimizer.current = new ChatQueryOptimizer(apiRequest);
    }
    
    if (!requestBatcher.current) {
      requestBatcher.current = new ChatRequestBatcher(apiRequest);
    }
    
    if (!dataSyncManager.current) {
      dataSyncManager.current = new ChatDataSyncManager(queryClient);
    }
  }, [apiRequest, queryClient]);
  
  // Optimized query functions
  const getOptimizedMessages = useCallback(async (options: ChatQueryOptions) => {
    return queryOptimizer.current?.getMessages(options) || [];
  }, []);
  
  const getOptimizedChatList = useCallback(async (userId: string, options?: any) => {
    return queryOptimizer.current?.getChatList(userId, options) || [];
  }, []);
  
  const prefetchMessages = useCallback(async (chatId: string, options?: any) => {
    return queryOptimizer.current?.prefetchMessages(chatId, options);
  }, []);
  
  const batchRequest = useCallback(async (type: string, request: any) => {
    return requestBatcher.current?.batchRequest(type, request);
  }, []);
  
  const applyOptimisticUpdate = useCallback((queryKey: string[], updateFn: (oldData: any) => any) => {
    dataSyncManager.current?.applyOptimisticUpdate(queryKey, updateFn);
  }, []);
  
  const confirmOptimisticUpdate = useCallback((queryKey: string[]) => {
    dataSyncManager.current?.confirmOptimisticUpdate(queryKey);
  }, []);
  
  const rollbackOptimisticUpdate = useCallback((queryKey: string[]) => {
    dataSyncManager.current?.rollbackOptimisticUpdate(queryKey);
  }, []);
  
  const invalidateChatCache = useCallback((chatId: string) => {
    queryOptimizer.current?.invalidateChatCache(chatId);
  }, []);
  
  const clearAllCache = useCallback(() => {
    queryOptimizer.current?.clearCache();
  }, []);
  
  return {
    // Query optimization
    getOptimizedMessages,
    getOptimizedChatList,
    prefetchMessages,
    
    // Request batching
    batchRequest,
    
    // Data synchronization
    applyOptimisticUpdate,
    confirmOptimisticUpdate,
    rollbackOptimisticUpdate,
    
    // Cache management
    invalidateChatCache,
    clearAllCache,
    
    // Managers for advanced usage
    queryOptimizer: queryOptimizer.current,
    requestBatcher: requestBatcher.current,
    dataSyncManager: dataSyncManager.current,
  };
}

/**
 * Pagination Hook for Chat Messages
 * Optimized pagination with cursor-based loading
 */
export function useChatPagination(chatId: string | null, pageSize: number = 50) {
  const [hasNextPage, setHasNextPage] = useState(true);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const loadNextPage = useCallback(async () => {
    if (!chatId || !hasNextPage || isLoading) return;
    
    setIsLoading(true);
    
    try {
      // Implementation would integrate with existing API
      const response = await fetch(`/api/group-chats/${chatId}/messages?limit=${pageSize}&after=${cursor || ''}`);
      const data = await response.json();
      
      setHasNextPage(data.hasNextPage);
      setCursor(data.nextCursor);
      
      return data.messages;
    } catch (error) {
      console.error('Error loading next page:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [chatId, hasNextPage, isLoading, cursor, pageSize]);
  
  const loadPreviousPage = useCallback(async () => {
    if (!chatId || !hasPreviousPage || isLoading) return;
    
    setIsLoading(true);
    
    try {
      const response = await fetch(`/api/group-chats/${chatId}/messages?limit=${pageSize}&before=${cursor || ''}`);
      const data = await response.json();
      
      setHasPreviousPage(data.hasPreviousPage);
      setCursor(data.previousCursor);
      
      return data.messages;
    } catch (error) {
      console.error('Error loading previous page:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [chatId, hasPreviousPage, isLoading, cursor, pageSize]);
  
  const resetPagination = useCallback(() => {
    setCursor(null);
    setHasNextPage(true);
    setHasPreviousPage(false);
  }, []);
  
  return {
    hasNextPage,
    hasPreviousPage,
    isLoading,
    loadNextPage,
    loadPreviousPage,
    resetPagination,
  };
}

/**
 * Export all database optimization utilities
 */
export {
  ChatQueryOptimizer,
  ChatRequestBatcher,
  ChatDataSyncManager
};