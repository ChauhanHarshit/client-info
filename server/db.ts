// PostgreSQL connection for Replit
import 'dotenv/config'
import { Pool } from 'pg';

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create PostgreSQL connection pool with better error handling
let pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // ssl: { rejectUnauthorized: false }, // Required for Supabase SSL connection
  // max: 10, // Reduce max connections for serverless
  // min: 0,  // Allow pool to scale to zero
  // idleTimeoutMillis: 30000, // Shorter idle timeout
  // connectionTimeoutMillis: 5000, // Shorter connection timeout
  // statement_timeout: 5000, // Shorter statement timeout
  // query_timeout: 5000, // Shorter query timeout
  // acquireTimeoutMillis: 5000, // Timeout for acquiring connection
});

// Function to recreate pool after termination
export const recreatePool = () => {
  console.log('🔄 RECREATING DATABASE CONNECTION POOL');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    statement_timeout: 5000,
    query_timeout: 5000,
    acquireTimeoutMillis: 5000,
  });
  return pool;
};

// Export pool with getter function
export { pool };

// Handle pool events
pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err);
});

pool.on('connect', () => {
  console.log('PostgreSQL client connected');
});

pool.on('remove', () => {
  console.log('PostgreSQL client removed');
});

// Improved query helper with better error handling and connection management
export async function queryDb(sql: string, params: any[] = []) {
  let client;
  try {
    console.log('Executing SQL:', sql.substring(0, 100) + (sql.length > 100 ? '...' : ''), 'with params:', params);
    
    // Get client with extended timeout
    client = await Promise.race([
      pool.connect(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), 15000)
      )
    ]) as any;
    
    const result = await client.query(sql, params);
    console.log('Query result rows:', result.rows.length);
    return result.rows;
  } catch (error) {
    console.error('Database query error:', error);
    
    // Check if it's a connection termination error
    if (error.code === '57P01' || error.message.includes('terminating connection')) {
      console.log('Connection terminated, attempting to reconnect...');
      // Let pool handle reconnection on next query
    }
    
    throw error;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (releaseError) {
        console.error('Error releasing client:', releaseError);
      }
    }
  }
}

// Health check function
export async function testConnection() {
  try {
    const result = await queryDb('SELECT 1 as test');
    return result.length > 0;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
}
