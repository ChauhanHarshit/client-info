// Server-side feed optimization for handling 5K-10K+ content items
// Database query optimization, pagination, and caching

import { Request, Response } from 'express';
import { db } from './db';
import { 
  contentInspirationPages, 
  contentInspirationItems, 
  creators, 
  creatorEngagements,
  creatorBookmarks 
} from '../shared/schema';
import { eq, and, desc, asc, sql, count, isNull } from 'drizzle-orm';

interface PaginationOptions {
  page: number;
  limit: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

interface QueryFilters {
  isActive?: boolean;
  mediaType?: string;
  pageId?: number;
  creatorId?: number;
  hasMedia?: boolean;
}

// Optimized query builder for content fetching
export class OptimizedContentQuery {
  private db: any;
  private defaultLimit = 50;
  private maxLimit = 100;

  constructor(database: any) {
    this.db = database;
  }

  // Build paginated content query with optimizations
  async getCreatorContent(
    creatorUsername: string,
    options: PaginationOptions,
    filters: QueryFilters = {}
  ) {
    const { page = 1, limit = this.defaultLimit, orderBy = 'created_at', orderDirection = 'desc' } = options;
    const actualLimit = Math.min(limit, this.maxLimit);
    const offset = (page - 1) * actualLimit;

    try {
      // Build base query with joins
      const baseQuery = this.db
        .select({
          id: contentInspirationItems.id,
          title: contentInspirationItems.title,
          description: contentInspirationItems.description,
          mediaUrl: contentInspirationItems.mediaUrl,
          mediaType: contentInspirationItems.mediaType,
          thumbnailUrl: contentInspirationItems.thumbnailUrl,
          pageId: contentInspirationItems.pageId,
          pageName: contentInspirationPages.name,
          isActive: contentInspirationItems.isActive,
          createdAt: contentInspirationItems.createdAt,
          updatedAt: contentInspirationItems.updatedAt,
          // Include engagement data
          hasEngagement: sql`CASE WHEN ${creatorEngagements.id} IS NOT NULL THEN true ELSE false END`,
          isLiked: creatorEngagements.liked,
          isBookmarked: sql`CASE WHEN ${creatorBookmarks.id} IS NOT NULL THEN true ELSE false END`
        })
        .from(contentInspirationItems)
        .leftJoin(
          contentInspirationPages,
          eq(contentInspirationItems.pageId, contentInspirationPages.id)
        )
        .leftJoin(
          creatorEngagements,
          and(
            eq(creatorEngagements.contentId, contentInspirationItems.id),
            eq(creatorEngagements.creatorUsername, creatorUsername)
          )
        )
        .leftJoin(
          creatorBookmarks,
          and(
            eq(creatorBookmarks.contentId, contentInspirationItems.id),
            eq(creatorBookmarks.creatorUsername, creatorUsername)
          )
        );

      // Apply filters
      const conditions = [];
      
      if (filters.isActive !== undefined) {
        conditions.push(eq(contentInspirationItems.isActive, filters.isActive));
      }
      
      if (filters.mediaType) {
        conditions.push(eq(contentInspirationItems.mediaType, filters.mediaType));
      }
      
      if (filters.pageId) {
        conditions.push(eq(contentInspirationItems.pageId, filters.pageId));
      }
      
      if (filters.hasMedia) {
        conditions.push(sql`${contentInspirationItems.mediaUrl} IS NOT NULL AND ${contentInspirationItems.mediaUrl} != ''`);
      }

      // Apply WHERE conditions
      let query = baseQuery;
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      // Apply ordering
      const orderField = this.getOrderField(orderBy);
      query = query.orderBy(orderDirection === 'desc' ? desc(orderField) : asc(orderField));

      // Apply pagination
      const contentQuery = query.limit(actualLimit).offset(offset);

      // Get total count for pagination
      const countQuery = this.db
        .select({ count: count() })
        .from(contentInspirationItems)
        .leftJoin(
          contentInspirationPages,
          eq(contentInspirationItems.pageId, contentInspirationPages.id)
        );

      if (conditions.length > 0) {
        countQuery.where(and(...conditions));
      }

      // Execute queries in parallel
      const [content, totalResult] = await Promise.all([
        contentQuery.execute(),
        countQuery.execute()
      ]);

      const total = totalResult[0]?.count || 0;
      const totalPages = Math.ceil(total / actualLimit);

      return {
        data: content,
        pagination: {
          page,
          limit: actualLimit,
          total,
          totalPages,
          hasMore: page < totalPages
        }
      };
    } catch (error) {
      console.error('Error in getCreatorContent:', error);
      throw error;
    }
  }

  // Get content for specific page with optimizations
  async getPageContent(
    pageId: number,
    options: PaginationOptions,
    filters: QueryFilters = {}
  ) {
    const { page = 1, limit = this.defaultLimit, orderBy = 'created_at', orderDirection = 'desc' } = options;
    const actualLimit = Math.min(limit, this.maxLimit);
    const offset = (page - 1) * actualLimit;

    try {
      // Build optimized query for single page
      const baseQuery = this.db
        .select({
          id: contentInspirationItems.id,
          title: contentInspirationItems.title,
          description: contentInspirationItems.description,
          mediaUrl: contentInspirationItems.mediaUrl,
          mediaType: contentInspirationItems.mediaType,
          thumbnailUrl: contentInspirationItems.thumbnailUrl,
          pageId: contentInspirationItems.pageId,
          isActive: contentInspirationItems.isActive,
          createdAt: contentInspirationItems.createdAt,
          updatedAt: contentInspirationItems.updatedAt
        })
        .from(contentInspirationItems)
        .where(
          and(
            eq(contentInspirationItems.pageId, pageId),
            eq(contentInspirationItems.isActive, true),
            ...(filters.mediaType ? [eq(contentInspirationItems.mediaType, filters.mediaType)] : [])
          )
        );

      // Apply ordering
      const orderField = this.getOrderField(orderBy);
      const contentQuery = baseQuery
        .orderBy(orderDirection === 'desc' ? desc(orderField) : asc(orderField))
        .limit(actualLimit)
        .offset(offset);

      // Get total count
      const countQuery = this.db
        .select({ count: count() })
        .from(contentInspirationItems)
        .where(
          and(
            eq(contentInspirationItems.pageId, pageId),
            eq(contentInspirationItems.isActive, true)
          )
        );

      const [content, totalResult] = await Promise.all([
        contentQuery.execute(),
        countQuery.execute()
      ]);

      const total = totalResult[0]?.count || 0;
      const totalPages = Math.ceil(total / actualLimit);

      return {
        data: content,
        pagination: {
          page,
          limit: actualLimit,
          total,
          totalPages,
          hasMore: page < totalPages
        }
      };
    } catch (error) {
      console.error('Error in getPageContent:', error);
      throw error;
    }
  }

  // Get creator bookmarks with optimizations
  async getCreatorBookmarks(
    creatorUsername: string,
    options: PaginationOptions,
    filters: QueryFilters = {}
  ) {
    const { page = 1, limit = this.defaultLimit, orderBy = 'bookmarked_at', orderDirection = 'desc' } = options;
    const actualLimit = Math.min(limit, this.maxLimit);
    const offset = (page - 1) * actualLimit;

    try {
      const baseQuery = this.db
        .select({
          id: contentInspirationItems.id,
          title: contentInspirationItems.title,
          description: contentInspirationItems.description,
          mediaUrl: contentInspirationItems.mediaUrl,
          mediaType: contentInspirationItems.mediaType,
          thumbnailUrl: contentInspirationItems.thumbnailUrl,
          pageId: contentInspirationItems.pageId,
          pageName: contentInspirationPages.name,
          isActive: contentInspirationItems.isActive,
          createdAt: contentInspirationItems.createdAt,
          bookmarkedAt: creatorBookmarks.createdAt
        })
        .from(creatorBookmarks)
        .innerJoin(
          contentInspirationItems,
          eq(creatorBookmarks.contentId, contentInspirationItems.id)
        )
        .leftJoin(
          contentInspirationPages,
          eq(contentInspirationItems.pageId, contentInspirationPages.id)
        )
        .where(eq(creatorBookmarks.creatorUsername, creatorUsername));

      // Apply filters
      if (filters.pageId) {
        baseQuery.where(eq(contentInspirationItems.pageId, filters.pageId));
      }

      // Apply ordering
      const orderField = orderBy === 'bookmarked_at' ? creatorBookmarks.createdAt : this.getOrderField(orderBy);
      const contentQuery = baseQuery
        .orderBy(orderDirection === 'desc' ? desc(orderField) : asc(orderField))
        .limit(actualLimit)
        .offset(offset);

      // Get total count
      const countQuery = this.db
        .select({ count: count() })
        .from(creatorBookmarks)
        .where(eq(creatorBookmarks.creatorUsername, creatorUsername));

      const [content, totalResult] = await Promise.all([
        contentQuery.execute(),
        countQuery.execute()
      ]);

      const total = totalResult[0]?.count || 0;
      const totalPages = Math.ceil(total / actualLimit);

      return {
        data: content,
        pagination: {
          page,
          limit: actualLimit,
          total,
          totalPages,
          hasMore: page < totalPages
        }
      };
    } catch (error) {
      console.error('Error in getCreatorBookmarks:', error);
      throw error;
    }
  }

  // Get content with engagement data
  async getContentWithEngagements(
    creatorUsername: string,
    contentIds: number[]
  ) {
    try {
      const result = await this.db
        .select({
          contentId: creatorEngagements.contentId,
          liked: creatorEngagements.liked,
          disliked: creatorEngagements.disliked,
          done: creatorEngagements.done,
          createdAt: creatorEngagements.createdAt
        })
        .from(creatorEngagements)
        .where(
          and(
            eq(creatorEngagements.creatorUsername, creatorUsername),
            sql`${creatorEngagements.contentId} IN (${contentIds.join(',')})`
          )
        );

      return result.reduce((acc, engagement) => {
        acc[engagement.contentId] = engagement;
        return acc;
      }, {} as Record<number, any>);
    } catch (error) {
      console.error('Error in getContentWithEngagements:', error);
      return {};
    }
  }

  // Batch content operations
  async batchUpdateEngagements(
    creatorUsername: string,
    updates: Array<{
      contentId: number;
      liked?: boolean;
      disliked?: boolean;
      done?: boolean;
    }>
  ) {
    try {
      const operations = updates.map(update => {
        return this.db
          .insert(creatorEngagements)
          .values({
            creatorUsername,
            contentId: update.contentId,
            liked: update.liked || false,
            disliked: update.disliked || false,
            done: update.done || false,
            createdAt: new Date()
          })
          .onConflictDoUpdate({
            target: [creatorEngagements.creatorUsername, creatorEngagements.contentId],
            set: {
              liked: update.liked !== undefined ? update.liked : sql`${creatorEngagements.liked}`,
              disliked: update.disliked !== undefined ? update.disliked : sql`${creatorEngagements.disliked}`,
              done: update.done !== undefined ? update.done : sql`${creatorEngagements.done}`,
              updatedAt: new Date()
            }
          });
      });

      await Promise.all(operations);
      return { success: true };
    } catch (error) {
      console.error('Error in batchUpdateEngagements:', error);
      throw error;
    }
  }

  private getOrderField(orderBy: string) {
    switch (orderBy) {
      case 'title':
        return contentInspirationItems.title;
      case 'created_at':
        return contentInspirationItems.createdAt;
      case 'updated_at':
        return contentInspirationItems.updatedAt;
      default:
        return contentInspirationItems.createdAt;
    }
  }
}

// Response cache for frequently accessed content
export class ResponseCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private cleanupInterval: NodeJS.Timeout;

  constructor(private defaultTTL = 30000) { // 30 seconds
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000); // Clean every minute
  }

  set(key: string, data: any, ttl = this.defaultTTL) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get(key: string): any {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  invalidate(pattern: string) {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  clear() {
    this.cache.clear();
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp > cached.ttl) {
        this.cache.delete(key);
      }
    }
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }
}

// Optimized route handlers
export class OptimizedRouteHandlers {
  private contentQuery: OptimizedContentQuery;
  private responseCache: ResponseCache;

  constructor(database: any) {
    this.contentQuery = new OptimizedContentQuery(database);
    this.responseCache = new ResponseCache();
  }

  // Creator content route with optimizations
  async getCreatorContent(req: Request, res: Response) {
    try {
      const { creatorUsername } = req.params;
      const {
        page = 1,
        limit = 50,
        orderBy = 'created_at',
        orderDirection = 'desc',
        ...filters
      } = req.query;

      const cacheKey = `creator:${creatorUsername}:${JSON.stringify(req.query)}`;
      
      // Check cache first
      const cached = this.responseCache.get(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      const result = await this.contentQuery.getCreatorContent(
        creatorUsername,
        {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          orderBy: orderBy as string,
          orderDirection: orderDirection as 'asc' | 'desc'
        },
        filters as QueryFilters
      );

      // Cache the result
      this.responseCache.set(cacheKey, result);

      res.json(result);
    } catch (error) {
      console.error('Error in getCreatorContent route:', error);
      res.status(500).json({ error: 'Failed to fetch creator content' });
    }
  }

  // Page content route with optimizations
  async getPageContent(req: Request, res: Response) {
    try {
      const { pageId } = req.params;
      const {
        page = 1,
        limit = 50,
        orderBy = 'created_at',
        orderDirection = 'desc',
        ...filters
      } = req.query;

      const cacheKey = `page:${pageId}:${JSON.stringify(req.query)}`;
      
      const cached = this.responseCache.get(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      const result = await this.contentQuery.getPageContent(
        parseInt(pageId as string),
        {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          orderBy: orderBy as string,
          orderDirection: orderDirection as 'asc' | 'desc'
        },
        filters as QueryFilters
      );

      this.responseCache.set(cacheKey, result);
      res.json(result);
    } catch (error) {
      console.error('Error in getPageContent route:', error);
      res.status(500).json({ error: 'Failed to fetch page content' });
    }
  }

  // Bookmarks route with optimizations
  async getCreatorBookmarks(req: Request, res: Response) {
    try {
      const { creatorUsername } = req.params;
      const {
        page = 1,
        limit = 50,
        orderBy = 'bookmarked_at',
        orderDirection = 'desc',
        ...filters
      } = req.query;

      const cacheKey = `bookmarks:${creatorUsername}:${JSON.stringify(req.query)}`;
      
      const cached = this.responseCache.get(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      const result = await this.contentQuery.getCreatorBookmarks(
        creatorUsername,
        {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          orderBy: orderBy as string,
          orderDirection: orderDirection as 'asc' | 'desc'
        },
        filters as QueryFilters
      );

      this.responseCache.set(cacheKey, result);
      res.json(result);
    } catch (error) {
      console.error('Error in getCreatorBookmarks route:', error);
      res.status(500).json({ error: 'Failed to fetch creator bookmarks' });
    }
  }

  // Batch engagement updates
  async batchUpdateEngagements(req: Request, res: Response) {
    try {
      const { creatorUsername } = req.params;
      const { updates } = req.body;

      if (!Array.isArray(updates)) {
        return res.status(400).json({ error: 'Updates must be an array' });
      }

      await this.contentQuery.batchUpdateEngagements(creatorUsername, updates);
      
      // Invalidate related caches
      this.responseCache.invalidate(`creator:${creatorUsername}`);
      this.responseCache.invalidate(`bookmarks:${creatorUsername}`);

      res.json({ success: true });
    } catch (error) {
      console.error('Error in batchUpdateEngagements route:', error);
      res.status(500).json({ error: 'Failed to update engagements' });
    }
  }

  // Health check for optimization status
  async getOptimizationHealth(req: Request, res: Response) {
    try {
      const cacheStats = {
        cacheSize: this.responseCache['cache'].size,
        // Add more cache statistics as needed
      };

      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        cache: cacheStats,
        optimizations: {
          virtualScrolling: true,
          lazyLoading: true,
          pagination: true,
          caching: true,
          prefetching: true
        }
      });
    } catch (error) {
      console.error('Error in getOptimizationHealth route:', error);
      res.status(500).json({ error: 'Failed to get optimization health' });
    }
  }
}

// Initialize optimized handlers
export function initializeOptimizedRoutes(database: any) {
  return new OptimizedRouteHandlers(database);
}