/**
 * Database Optimization Layer for CRM System
 * Implements connection pooling, query optimization, and caching for 400+ employee scaling
 */

import { Pool } from 'pg';
import { createClient } from '@supabase/supabase-js';

// Connection pool configuration for high-concurrency scenarios
const connectionPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Required for Supabase SSL connection
  max: 50, // Maximum 50 concurrent connections
  min: 5,  // Minimum 5 idle connections
  idleTimeoutMillis: 30000, // 30 second idle timeout
  connectionTimeoutMillis: 5000, // 5 second connection timeout
  acquireTimeoutMillis: 5000, // 5 second acquire timeout
  allowExitOnIdle: true,
});

// Query cache for frequently accessed data
class QueryCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  
  set(key: string, data: any, ttl: number = 300000): void { // 5 minute default TTL
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }
  
  get(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }
  
  invalidate(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
  
  clear(): void {
    this.cache.clear();
  }
}

const queryCache = new QueryCache();

// Optimized database client with connection pooling
export class OptimizedDB {
  private pool: Pool;
  private cache: QueryCache;
  
  constructor() {
    this.pool = connectionPool;
    this.cache = queryCache;
  }
  
  // Execute query with connection pooling and caching
  async query(sql: string, params: any[] = [], cacheKey?: string, cacheTtl?: number): Promise<any> {
    // Check cache first if cache key provided
    if (cacheKey) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        console.log(`📊 Cache hit for: ${cacheKey}`);
        return cached;
      }
    }
    
    const start = Date.now();
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(sql, params);
      const duration = Date.now() - start;
      
      console.log(`📊 Database query executed in ${duration}ms`);
      
      // Cache result if cache key provided
      if (cacheKey && cacheTtl) {
        this.cache.set(cacheKey, result.rows, cacheTtl);
      }
      
      return result.rows;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  // Batch multiple queries for efficiency
  async batchQuery(queries: Array<{ sql: string; params: any[]; cacheKey?: string; cacheTtl?: number }>): Promise<any[]> {
    const client = await this.pool.connect();
    const results = [];
    
    try {
      await client.query('BEGIN');
      
      for (const query of queries) {
        // Check cache first
        if (query.cacheKey) {
          const cached = this.cache.get(query.cacheKey);
          if (cached) {
            results.push(cached);
            continue;
          }
        }
        
        const result = await client.query(query.sql, query.params);
        
        // Cache result if requested
        if (query.cacheKey && query.cacheTtl) {
          this.cache.set(query.cacheKey, result.rows, query.cacheTtl);
        }
        
        results.push(result.rows);
      }
      
      await client.query('COMMIT');
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  // Optimized user authentication query
  async authenticateUser(email: string): Promise<any> {
    const cacheKey = `auth_user_${email}`;
    return this.query(
      'SELECT * FROM users WHERE email = $1 AND is_active = true',
      [email],
      cacheKey,
      60000 // 1 minute cache for auth queries
    );
  }
  
  // Optimized session validation
  async validateSession(sessionId: string): Promise<any> {
    const cacheKey = `session_${sessionId}`;
    return this.query(
      'SELECT * FROM sessions WHERE id = $1 AND expires_at > NOW()',
      [sessionId],
      cacheKey,
      30000 // 30 second cache for session validation
    );
  }
  
  // Optimized employee list query
  async getEmployeeList(): Promise<any> {
    const cacheKey = 'employee_list';
    return this.query(
      'SELECT id, first_name, last_name, email, role, team_id, is_active FROM users WHERE is_active = true ORDER BY last_name',
      [],
      cacheKey,
      300000 // 5 minute cache for employee list
    );
  }
  
  // Optimized permissions query
  async getUserPermissions(userId: string): Promise<any> {
    const cacheKey = `permissions_${userId}`;
    return this.query(
      'SELECT permission_name FROM user_permissions WHERE user_id = $1',
      [userId],
      cacheKey,
      600000 // 10 minute cache for permissions
    );
  }
  
  // Cache invalidation methods
  invalidateUserCache(userId: string): void {
    this.cache.invalidate(`user_${userId}`);
    this.cache.invalidate(`permissions_${userId}`);
    this.cache.invalidate('employee_list');
  }
  
  invalidateSessionCache(sessionId: string): void {
    this.cache.invalidate(`session_${sessionId}`);
  }
  
  // Connection pool health monitoring
  getPoolStats(): any {
    return {
      totalConnections: this.pool.totalCount,
      idleConnections: this.pool.idleCount,
      waitingClients: this.pool.waitingCount,
      cacheSize: this.cache['cache'].size
    };
  }
}

// Singleton instance
export const optimizedDB = new OptimizedDB();

// Database indexes for performance optimization
export const performanceIndexes = [
  // User authentication indexes
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_active ON users(email, is_active);',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role_active ON users(role, is_active);',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_team_active ON users(team_id, is_active);',
  
  // Session management indexes
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);',
  
  // Permission system indexes
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_permissions_permission ON user_permissions(permission_name);',
  
  // Content system indexes (for CRM dashboard performance)
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_content_inspiration_pages_active ON content_inspiration_pages(is_active);',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_content_inspiration_items_page_id ON content_inspiration_items(page_id);',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_creators_active ON creators(is_active);',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_creator_logins_active ON creator_logins(is_active);',
  
  // Group chat indexes
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_group_chats_active ON group_chats(is_active);',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_group_chat_messages_chat_id ON group_chat_messages(chat_id);',
  
  // Calendar event indexes
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_calendar_events_date ON calendar_events(start_date);',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_calendar_events_creator ON calendar_events(creator_id);',
];

// Initialize performance indexes
export async function initializePerformanceIndexes(): Promise<void> {
  console.log('🚀 Initializing database performance indexes...');
  
  for (const indexSql of performanceIndexes) {
    try {
      await optimizedDB.query(indexSql);
      console.log(`✅ Index created successfully`);
    } catch (error: any) {
      if (error.code === '42P07') {
        console.log(`📋 Index already exists, skipping`);
      } else {
        console.error(`❌ Index creation failed:`, error);
      }
    }
  }
  
  console.log('✅ Database performance optimization complete');
}

// Connection pool monitoring
setInterval(() => {
  const stats = optimizedDB.getPoolStats();
  console.log(`📊 DB Pool Stats - Total: ${stats.totalConnections}, Idle: ${stats.idleConnections}, Waiting: ${stats.waitingClients}, Cache: ${stats.cacheSize}`);
}, 30000); // Log every 30 seconds

export default optimizedDB;