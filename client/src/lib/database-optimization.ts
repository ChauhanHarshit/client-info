// Database optimization layer for efficient content queries
// Handles pagination, indexing, and query optimization for 5K-10K+ content items

interface QueryOptions {
  page?: number;
  limit?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  filters?: Record<string, any>;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

// Optimized query builder for content fetching
export class ContentQueryBuilder {
  private baseUrl: string;
  private defaultLimit = 50;
  private maxLimit = 100;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  // Build optimized query for creator content
  buildCreatorContentQuery(creatorUsername: string, options: QueryOptions = {}): string {
    const params = new URLSearchParams();
    
    // Pagination
    params.set('page', String(options.page || 1));
    params.set('limit', String(Math.min(options.limit || this.defaultLimit, this.maxLimit)));
    
    // Ordering - optimized for database indexes
    params.set('orderBy', options.orderBy || 'created_at');
    params.set('orderDirection', options.orderDirection || 'desc');
    
    // Filters
    if (options.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.set(key, String(value));
        }
      });
    }
    
    // Add performance hints
    params.set('includeMetadata', 'true');
    params.set('optimizeFor', 'feed');
    
    return `${this.baseUrl}/creator/${creatorUsername}/content?${params.toString()}`;
  }

  // Build query for specific page content
  buildPageContentQuery(pageId: number, options: QueryOptions = {}): string {
    const params = new URLSearchParams();
    
    params.set('page', String(options.page || 1));
    params.set('limit', String(Math.min(options.limit || this.defaultLimit, this.maxLimit)));
    params.set('orderBy', options.orderBy || 'created_at');
    params.set('orderDirection', options.orderDirection || 'desc');
    
    // Only active content
    params.set('isActive', 'true');
    
    if (options.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.set(key, String(value));
        }
      });
    }
    
    return `${this.baseUrl}/inspo-pages/${pageId}/content?${params.toString()}`;
  }

  // Build query for bookmarked content
  buildBookmarkQuery(creatorId: number, options: QueryOptions = {}): string {
    const params = new URLSearchParams();
    
    params.set('page', String(options.page || 1));
    params.set('limit', String(Math.min(options.limit || this.defaultLimit, this.maxLimit)));
    params.set('orderBy', options.orderBy || 'bookmarked_at');
    params.set('orderDirection', options.orderDirection || 'desc');
    
    if (options.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.set(key, String(value));
        }
      });
    }
    
    return `${this.baseUrl}/creator-auth/bookmarks?${params.toString()}`;
  }
}

// Request batching and deduplication
export class RequestBatcher {
  private pendingRequests = new Map<string, Promise<any>>();
  private batchQueue: Array<{ key: string; resolver: (data: any) => void; rejector: (error: any) => void }> = [];
  private batchTimeout: NodeJS.Timeout | null = null;
  private batchSize = 10;
  private batchDelay = 50; // ms

  // Deduplicate identical requests
  async request<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    // Return existing request if in progress
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key)!;
    }

    // Create new request
    const promise = requestFn();
    this.pendingRequests.set(key, promise);

    // Clean up after completion
    promise.finally(() => {
      this.pendingRequests.delete(key);
    });

    return promise;
  }

  // Batch multiple requests together
  async batchRequest<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      // Add to batch queue
      this.batchQueue.push({
        key,
        resolver: resolve,
        rejector: reject
      });

      // Process batch if full or start timer
      if (this.batchQueue.length >= this.batchSize) {
        this.processBatch();
      } else if (!this.batchTimeout) {
        this.batchTimeout = setTimeout(() => {
          this.processBatch();
        }, this.batchDelay);
      }
    });
  }

  private async processBatch() {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    const currentBatch = this.batchQueue.splice(0, this.batchSize);
    
    if (currentBatch.length === 0) return;

    // Group requests by type for efficient processing
    const groupedRequests = new Map<string, typeof currentBatch>();
    
    currentBatch.forEach(request => {
      const requestType = request.key.split(':')[0];
      if (!groupedRequests.has(requestType)) {
        groupedRequests.set(requestType, []);
      }
      groupedRequests.get(requestType)!.push(request);
    });

    // Process each group
    for (const [type, requests] of groupedRequests) {
      await this.processRequestGroup(type, requests);
    }
  }

  private async processRequestGroup(type: string, requests: typeof this.batchQueue) {
    try {
      // Process requests in parallel within the group
      const promises = requests.map(async (request) => {
        try {
          // Here you would implement the actual request logic
          // For now, we'll simulate with a simple fetch
          const response = await fetch(request.key);
          const data = await response.json();
          request.resolver(data);
        } catch (error) {
          request.rejector(error);
        }
      });

      await Promise.all(promises);
    } catch (error) {
      // Handle group-level errors
      requests.forEach(request => request.rejector(error));
    }
  }

  clear() {
    this.pendingRequests.clear();
    this.batchQueue.length = 0;
    
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
  }
}

// Intelligent prefetching system
export class ContentPrefetcher {
  private prefetchCache = new Map<string, any>();
  private prefetchQueue: string[] = [];
  private isProcessing = false;
  private maxPrefetchItems = 20;
  private prefetchDistance = 3; // Items ahead to prefetch

  async prefetchContent(
    creatorUsername: string,
    currentIndex: number,
    totalItems: number,
    queryBuilder: ContentQueryBuilder
  ) {
    // Calculate what to prefetch based on current position
    const prefetchTargets = this.calculatePrefetchTargets(currentIndex, totalItems);
    
    for (const target of prefetchTargets) {
      const cacheKey = `${creatorUsername}:${target.page}:${target.limit}`;
      
      if (!this.prefetchCache.has(cacheKey) && !this.prefetchQueue.includes(cacheKey)) {
        this.prefetchQueue.push(cacheKey);
      }
    }

    this.processPrefetchQueue(creatorUsername, queryBuilder);
  }

  private calculatePrefetchTargets(currentIndex: number, totalItems: number): Array<{page: number; limit: number}> {
    const targets: Array<{page: number; limit: number}> = [];
    const itemsPerPage = 50;
    const currentPage = Math.floor(currentIndex / itemsPerPage) + 1;
    
    // Prefetch current page + next few pages
    for (let i = 0; i < this.prefetchDistance; i++) {
      const targetPage = currentPage + i;
      const maxPage = Math.ceil(totalItems / itemsPerPage);
      
      if (targetPage <= maxPage) {
        targets.push({ page: targetPage, limit: itemsPerPage });
      }
    }
    
    return targets;
  }

  private async processPrefetchQueue(creatorUsername: string, queryBuilder: ContentQueryBuilder) {
    if (this.isProcessing || this.prefetchQueue.length === 0) return;

    this.isProcessing = true;

    try {
      // Process prefetch queue with rate limiting
      while (this.prefetchQueue.length > 0 && this.prefetchCache.size < this.maxPrefetchItems) {
        const cacheKey = this.prefetchQueue.shift()!;
        const [username, page, limit] = cacheKey.split(':');
        
        if (username === creatorUsername) {
          const query = queryBuilder.buildCreatorContentQuery(creatorUsername, {
            page: parseInt(page),
            limit: parseInt(limit)
          });

          try {
            const response = await fetch(query, { credentials: 'include' });
            if (response.ok) {
              const data = await response.json();
              this.prefetchCache.set(cacheKey, data);
            }
          } catch (error) {
            console.warn('Prefetch failed for:', cacheKey, error);
          }
        }

        // Small delay to prevent overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } finally {
      this.isProcessing = false;
    }
  }

  getCachedContent(key: string): any {
    return this.prefetchCache.get(key);
  }

  clearCache() {
    this.prefetchCache.clear();
    this.prefetchQueue.length = 0;
  }
}

// Performance-optimized content fetcher
export class OptimizedContentFetcher {
  private queryBuilder: ContentQueryBuilder;
  private requestBatcher: RequestBatcher;
  private prefetcher: ContentPrefetcher;
  private responseCache = new Map<string, { data: any; timestamp: number }>();
  private cacheTimeout = 30000; // 30 seconds

  constructor(baseUrl: string = '/api') {
    this.queryBuilder = new ContentQueryBuilder(baseUrl);
    this.requestBatcher = new RequestBatcher();
    this.prefetcher = new ContentPrefetcher();
  }

  // Fetch creator content with optimizations
  async fetchCreatorContent(
    creatorUsername: string,
    options: QueryOptions = {}
  ): Promise<PaginatedResponse<any>> {
    const cacheKey = `creator:${creatorUsername}:${JSON.stringify(options)}`;
    
    // Check cache first
    const cached = this.getCachedResponse(cacheKey);
    if (cached) {
      return cached;
    }

    // Check prefetch cache
    const prefetched = this.prefetcher.getCachedContent(cacheKey);
    if (prefetched) {
      this.setCachedResponse(cacheKey, prefetched);
      return prefetched;
    }

    // Make request with deduplication
    const query = this.queryBuilder.buildCreatorContentQuery(creatorUsername, options);
    
    const response = await this.requestBatcher.request(cacheKey, async () => {
      const res = await fetch(query, { credentials: 'include' });
      
      if (!res.ok) {
        throw new Error(`Failed to fetch content: ${res.status} ${res.statusText}`);
      }
      
      return await res.json();
    });

    // Cache the response
    this.setCachedResponse(cacheKey, response);
    
    // Trigger prefetching for next items
    if (response.pagination) {
      this.prefetcher.prefetchContent(
        creatorUsername,
        (response.pagination.page - 1) * response.pagination.limit,
        response.pagination.total,
        this.queryBuilder
      );
    }

    return response;
  }

  // Fetch page content with optimizations
  async fetchPageContent(
    pageId: number,
    options: QueryOptions = {}
  ): Promise<PaginatedResponse<any>> {
    const cacheKey = `page:${pageId}:${JSON.stringify(options)}`;
    
    const cached = this.getCachedResponse(cacheKey);
    if (cached) {
      return cached;
    }

    const query = this.queryBuilder.buildPageContentQuery(pageId, options);
    
    const response = await this.requestBatcher.request(cacheKey, async () => {
      const res = await fetch(query, { credentials: 'include' });
      
      if (!res.ok) {
        throw new Error(`Failed to fetch page content: ${res.status} ${res.statusText}`);
      }
      
      return await res.json();
    });

    this.setCachedResponse(cacheKey, response);
    return response;
  }

  // Fetch bookmarks with optimizations
  async fetchBookmarks(
    creatorId: number,
    options: QueryOptions = {}
  ): Promise<PaginatedResponse<any>> {
    const cacheKey = `bookmarks:${creatorId}:${JSON.stringify(options)}`;
    
    const cached = this.getCachedResponse(cacheKey);
    if (cached) {
      return cached;
    }

    const query = this.queryBuilder.buildBookmarkQuery(creatorId, options);
    
    const response = await this.requestBatcher.request(cacheKey, async () => {
      const res = await fetch(query, { credentials: 'include' });
      
      if (!res.ok) {
        throw new Error(`Failed to fetch bookmarks: ${res.status} ${res.statusText}`);
      }
      
      return await res.json();
    });

    this.setCachedResponse(cacheKey, response);
    return response;
  }

  private getCachedResponse(key: string): any {
    const cached = this.responseCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  private setCachedResponse(key: string, data: any) {
    this.responseCache.set(key, {
      data,
      timestamp: Date.now()
    });

    // Clean up old cache entries
    this.cleanupCache();
  }

  private cleanupCache() {
    const now = Date.now();
    for (const [key, value] of this.responseCache.entries()) {
      if (now - value.timestamp > this.cacheTimeout) {
        this.responseCache.delete(key);
      }
    }
  }

  // Clear all caches
  clearCache() {
    this.responseCache.clear();
    this.requestBatcher.clear();
    this.prefetcher.clearCache();
  }
}

// Export singleton instance
export const optimizedContentFetcher = new OptimizedContentFetcher();