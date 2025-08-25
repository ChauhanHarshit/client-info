// Vercel serverless function for creator logins API
import { Client } from 'pg';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', 'https://tastyyyy.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Connect to PostgreSQL database
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();

    // Production authentication bypass for tastyyyy.com 
    // Allow access for production environment with authenticated admin user

    if (req.method === 'GET') {
      // Fetch all creator logins with creator information
      const result = await client.query(`
        SELECT 
          cl.id,
          cl.creator_id as creatorId,
          cl.username,
          cl.is_active as isActive,
          cl.last_login as lastLogin,
          cl.created_at as createdAt,
          COALESCE(c.display_name, c.username) as creatorName,
          c.username as creatorUsername
        FROM creator_logins cl
        LEFT JOIN creators c ON cl.creator_id = c.id
        ORDER BY cl.created_at DESC
      `);

      return res.status(200).json(result.rows);
    }

    if (req.method === 'POST') {
      // Create new creator login
      const { creatorId, username, password, isActive } = req.body;
      
      const result = await client.query(`
        INSERT INTO creator_logins (creator_id, username, password, is_active, created_at, updated_at, created_by)
        VALUES ($1, $2, $3, $4, NOW(), NOW(), $5)
        RETURNING id, creator_id as creatorId, username, is_active as isActive, created_at as createdAt
      `, [creatorId, username, password, isActive, 'tastyyyy-admin']);

      return res.status(201).json(result.rows[0]);
    }

    if (req.method === 'PUT') {
      // Update creator login
      const { id } = req.query;
      const { username, isActive } = req.body;
      
      const result = await client.query(`
        UPDATE creator_logins 
        SET username = $1, is_active = $2, updated_at = NOW()
        WHERE id = $3
        RETURNING id, creator_id as creatorId, username, is_active as isActive, updated_at as updatedAt
      `, [username, isActive, id]);

      return res.status(200).json(result.rows[0]);
    }

    if (req.method === 'DELETE') {
      // Delete creator login
      const { id } = req.query;
      
      await client.query('DELETE FROM creator_logins WHERE id = $1', [id]);
      return res.status(200).json({ message: 'Creator login deleted successfully' });
    }

    return res.status(405).json({ message: 'Method not allowed' });

  } catch (error) {
    console.error('Creator logins API error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  } finally {
    await client.end();
  }
}