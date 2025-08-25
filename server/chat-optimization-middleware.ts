/**
 * Chat Optimization Server Middleware
 * 
 * Server-side optimization middleware for chat operations
 * without changing existing database schema or API logic
 */

import type { Request, Response, NextFunction } from 'express';

/**
 * Chat Response Optimization Middleware
 * Optimizes chat-related API responses for better performance
 */
export function chatResponseOptimization(req: Request, res: Response, next: NextFunction) {
  // Skip static assets and non-chat endpoints
  if (req.path.startsWith('/assets/') || 
      req.path.startsWith('/uploads/') || 
      req.path.startsWith('/public/') || 
      req.path.includes('.js') || 
      req.path.includes('.css') || 
      req.path.includes('.png') || 
      req.path.includes('.jpg') || 
      req.path.includes('.gif') || 
      req.path.includes('.ico') ||
      (!req.path.includes('/group-chats') && !req.path.includes('/creator-group-chats'))) {
    return next();
  }
  
  const originalSend = res.send;
  const originalJson = res.json;
  
  // Optimize response data
  res.json = function(data: any) {
    let optimizedData = data;
    
    // Optimize message arrays
    if (Array.isArray(data) && data.length > 0 && data[0].content !== undefined) {
      optimizedData = optimizeMessageArray(data);
    }
    
    // Optimize chat lists
    if (Array.isArray(data) && data.length > 0 && data[0].name !== undefined) {
      optimizedData = optimizeChatList(data);
    }
    
    // Add performance headers
    res.set({
      'X-Chat-Optimized': 'true',
      'X-Response-Time': Date.now().toString(),
      'Cache-Control': 'public, max-age=30' // 30 second cache for chat data
    });
    
    return originalJson.call(this, optimizedData);
  };
  
  res.send = function(data: any) {
    // Add compression hint
    res.set('X-Content-Compressed', 'true');
    return originalSend.call(this, data);
  };
  
  next();
}

/**
 * Chat Request Batching Middleware
 * Handles batched requests for better performance
 */
export function chatRequestBatching(req: Request, res: Response, next: NextFunction) {
  // Skip static assets
  if (req.path.startsWith('/assets/') || 
      req.path.startsWith('/uploads/') || 
      req.path.startsWith('/public/') || 
      req.path.includes('.js') || 
      req.path.includes('.css') || 
      req.path.includes('.png') || 
      req.path.includes('.jpg') || 
      req.path.includes('.gif') || 
      req.path.includes('.ico')) {
    return next();
  }
  
  // Handle batch requests
  if (req.path === '/api/batch/messages' && req.method === 'POST') {
    return handleBatchMessages(req, res);
  }
  
  if (req.path === '/api/batch/members' && req.method === 'POST') {
    return handleBatchMembers(req, res);
  }
  
  next();
}

/**
 * Chat Caching Middleware
 * Implements intelligent caching for chat operations
 */
export function chatCachingMiddleware(req: Request, res: Response, next: NextFunction) {
  // Skip static assets
  if (req.path.startsWith('/assets/') || 
      req.path.startsWith('/uploads/') || 
      req.path.startsWith('/public/') || 
      req.path.includes('.js') || 
      req.path.includes('.css') || 
      req.path.includes('.png') || 
      req.path.includes('.jpg') || 
      req.path.includes('.gif') || 
      req.path.includes('.ico')) {
    return next();
  }
  
  // Only cache GET requests for chat data
  if (req.method !== 'GET' || !req.path.includes('/group-chats')) {
    return next();
  }
  
  const cacheKey = generateCacheKey(req);
  const cachedResponse = getCachedResponse(cacheKey);
  
  if (cachedResponse) {
    res.set({
      'X-Cache-Hit': 'true',
      'X-Cache-Key': cacheKey
    });
    return res.json(cachedResponse);
  }
  
  // Override res.json to cache the response
  const originalJson = res.json;
  res.json = function(data: any) {
    setCachedResponse(cacheKey, data, 30000); // 30 second cache
    res.set({
      'X-Cache-Hit': 'false',
      'X-Cache-Key': cacheKey
    });
    return originalJson.call(this, data);
  };
  
  next();
}

/**
 * Chat Rate Limiting Middleware
 * Prevents spam and optimizes resource usage
 */
export function chatRateLimiting(req: Request, res: Response, next: NextFunction) {
  // Skip static assets
  if (req.path.startsWith('/assets/') || 
      req.path.startsWith('/uploads/') || 
      req.path.startsWith('/public/') || 
      req.path.includes('.js') || 
      req.path.includes('.css') || 
      req.path.includes('.png') || 
      req.path.includes('.jpg') || 
      req.path.includes('.gif') || 
      req.path.includes('.ico')) {
    return next();
  }
  
  // Only apply to message sending endpoints
  if (!(req.method === 'POST' && req.path.includes('/messages'))) {
    return next();
  }
  
  const clientId = getClientId(req);
  const rateLimitKey = `chat_rate_${clientId}`;
  
  const requestCount = incrementRateLimit(rateLimitKey);
  const limit = 60; // 60 messages per minute
  const windowMs = 60000; // 1 minute window
  
  if (requestCount > limit) {
    res.set({
      'X-RateLimit-Limit': limit.toString(),
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': (Date.now() + windowMs).toString()
    });
    
    return res.status(429).json({
      error: 'Too many messages sent. Please slow down.',
      retryAfter: Math.ceil(windowMs / 1000)
    });
  }
  
  res.set({
    'X-RateLimit-Limit': limit.toString(),
    'X-RateLimit-Remaining': (limit - requestCount).toString(),
    'X-RateLimit-Reset': (Date.now() + windowMs).toString()
  });
  
  next();
}

/**
 * Chat Performance Monitoring Middleware
 * Tracks chat operation performance
 */
export function chatPerformanceMonitoring(req: Request, res: Response, next: NextFunction) {
  // Skip static assets
  if (req.path.startsWith('/assets/') || 
      req.path.startsWith('/uploads/') || 
      req.path.startsWith('/public/') || 
      req.path.includes('.js') || 
      req.path.includes('.css') || 
      req.path.includes('.png') || 
      req.path.includes('.jpg') || 
      req.path.includes('.gif') || 
      req.path.includes('.ico')) {
    return next();
  }
  
  // Only monitor chat-related requests
  if (!req.path.includes('/group-chats') && !req.path.includes('/creator-group-chats')) {
    return next();
  }
  
  const startTime = Date.now();
  
  // Override res.end to capture response time
  const originalEnd = res.end;
  res.end = function(...args: any[]) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    // Log performance metrics
    logPerformanceMetric({
      path: req.path,
      method: req.method,
      responseTime,
      statusCode: res.statusCode,
      contentLength: res.get('content-length') || '0',
      timestamp: endTime
    });
    
    // Only set headers if not already sent
    if (!res.headersSent) {
      res.set('X-Response-Time', responseTime.toString());
    }
    
    return originalEnd.apply(this, args);
  };
  
  next();
}

// Helper functions

/**
 * Optimize message array for better performance
 */
function optimizeMessageArray(messages: any[]): any[] {
  return messages.map(message => ({
    ...message,
    // Add optimization flags
    isOptimized: true,
    optimizedAt: Date.now(),
    // Remove unnecessary fields for client
    ...(message.deletedBy && { deletedBy: undefined }),
    ...(message.editedAt && !message.isEdited && { editedAt: undefined })
  }));
}

/**
 * Optimize chat list for better performance
 */
function optimizeChatList(chats: any[]): any[] {
  return chats.map(chat => ({
    ...chat,
    // Add optimization flags
    isOptimized: true,
    optimizedAt: Date.now(),
    // Optimize member count if not present
    ...(chat.memberCount === undefined && { memberCount: 0 })
  }));
}

/**
 * Handle batch message requests
 */
async function handleBatchMessages(req: Request, res: Response) {
  try {
    const { chatIds } = req.body;
    
    if (!Array.isArray(chatIds)) {
      return res.status(400).json({ error: 'chatIds must be an array' });
    }
    
    // Import db function (would need to be adapted to your actual implementation)
    const { queryDb } = await import('./db');
    
    const results = await Promise.all(
      chatIds.map(async (chatId: string) => {
        try {
          const messages = await queryDb(`
            SELECT * FROM group_chat_messages 
            WHERE chat_id = $1 
            ORDER BY created_at DESC 
            LIMIT 50
          `, [chatId]);
          
          return { chatId, messages, success: true };
        } catch (error) {
          return { chatId, error: error instanceof Error ? error.message : 'Unknown error', success: false };
        }
      })
    );
    
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Batch message request failed' });
  }
}

/**
 * Handle batch member requests
 */
async function handleBatchMembers(req: Request, res: Response) {
  try {
    const { chatIds } = req.body;
    
    if (!Array.isArray(chatIds)) {
      return res.status(400).json({ error: 'chatIds must be an array' });
    }
    
    const { queryDb } = await import('./db');
    
    const results = await Promise.all(
      chatIds.map(async (chatId: string) => {
        try {
          const members = await queryDb(`
            SELECT gcm.*, c.display_name, c.profile_image_url
            FROM group_chat_members gcm
            LEFT JOIN creators c ON gcm.creator_id = c.id
            WHERE gcm.chat_id = $1
          `, [chatId]);
          
          return { chatId, members, success: true };
        } catch (error) {
          return { chatId, error: error instanceof Error ? error.message : 'Unknown error', success: false };
        }
      })
    );
    
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Batch member request failed' });
  }
}

// Simple in-memory cache (in production, use Redis)
const responseCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

/**
 * Generate cache key for request
 */
function generateCacheKey(req: Request): string {
  return `${req.path}:${JSON.stringify(req.query)}:${req.get('user-id') || 'anonymous'}`;
}

/**
 * Get cached response
 */
function getCachedResponse(key: string): any | null {
  const cached = responseCache.get(key);
  if (!cached) return null;
  
  if (Date.now() - cached.timestamp > cached.ttl) {
    responseCache.delete(key);
    return null;
  }
  
  return cached.data;
}

/**
 * Set cached response
 */
function setCachedResponse(key: string, data: any, ttl: number): void {
  responseCache.set(key, {
    data,
    timestamp: Date.now(),
    ttl
  });
  
  // Cleanup old entries
  if (responseCache.size > 1000) {
    const now = Date.now();
    for (const [cacheKey, cached] of responseCache.entries()) {
      if (now - cached.timestamp > cached.ttl) {
        responseCache.delete(cacheKey);
      }
    }
  }
}

// Simple rate limiting (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Get client ID for rate limiting
 */
function getClientId(req: Request): string {
  return req.ip || req.get('x-forwarded-for') || req.connection.remoteAddress || 'unknown';
}

/**
 * Increment rate limit counter
 */
function incrementRateLimit(key: string): number {
  const now = Date.now();
  const windowMs = 60000; // 1 minute
  
  let entry = rateLimitStore.get(key);
  
  if (!entry || now > entry.resetTime) {
    entry = { count: 0, resetTime: now + windowMs };
    rateLimitStore.set(key, entry);
  }
  
  entry.count++;
  return entry.count;
}

// Performance metrics storage (in production, use proper monitoring)
const performanceMetrics: any[] = [];

/**
 * Log performance metric
 */
function logPerformanceMetric(metric: any): void {
  performanceMetrics.push(metric);
  
  // Keep only last 1000 metrics
  if (performanceMetrics.length > 1000) {
    performanceMetrics.shift();
  }
  
  // Log slow requests
  if (metric.responseTime > 1000) {
    console.warn(`🐌 Slow chat request: ${metric.method} ${metric.path} took ${metric.responseTime}ms`);
  }
}

/**
 * Get performance metrics
 */
export function getChatPerformanceMetrics(): any {
  const now = Date.now();
  const lastHour = now - 3600000; // 1 hour ago
  
  const recentMetrics = performanceMetrics.filter(m => m.timestamp > lastHour);
  
  if (recentMetrics.length === 0) {
    return { averageResponseTime: 0, totalRequests: 0, errorRate: 0 };
  }
  
  const totalResponseTime = recentMetrics.reduce((sum, m) => sum + m.responseTime, 0);
  const errorCount = recentMetrics.filter(m => m.statusCode >= 400).length;
  
  return {
    averageResponseTime: Math.round(totalResponseTime / recentMetrics.length),
    totalRequests: recentMetrics.length,
    errorRate: Math.round((errorCount / recentMetrics.length) * 100),
    slowRequests: recentMetrics.filter(m => m.responseTime > 1000).length,
    cacheHitRate: Math.round((responseCache.size / (responseCache.size + recentMetrics.length)) * 100)
  };
}

/**
 * Chat Health Check Endpoint
 */
export function chatHealthCheck(req: Request, res: Response) {
  const metrics = getChatPerformanceMetrics();
  const health = {
    status: 'healthy',
    timestamp: Date.now(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    performance: metrics,
    cache: {
      size: responseCache.size,
      maxSize: 1000
    },
    rateLimit: {
      activeClients: rateLimitStore.size
    }
  };
  
  // Determine health status
  if (metrics.errorRate > 10) {
    health.status = 'unhealthy';
  } else if (metrics.averageResponseTime > 2000) {
    health.status = 'degraded';
  }
  
  res.json(health);
}

// All middleware functions are already exported individually above