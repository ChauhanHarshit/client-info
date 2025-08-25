// Vercel serverless function for creator authentication
import { Client } from 'pg';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
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

    // POST /api/creator-auth/login - Creator authentication
    if (req.method === 'POST' && req.url.includes('/login')) {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
      }

      console.log('Creator login attempt for username:', username);

      // Find creator login by username (case insensitive)
      const result = await client.query(`
        SELECT cl.id, cl.creator_id, cl.username, cl.password, cl.is_active,
               c.display_name as display_name, c.email
        FROM creator_logins cl
        JOIN creators c ON cl.creator_id = c.id
        WHERE LOWER(cl.username) = LOWER($1) AND cl.is_active = true
      `, [username]);

      if (result.rows.length === 0) {
        console.log('Creator not found for username:', username);
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const creatorLogin = result.rows[0];
      console.log('Found creator:', creatorLogin.username);

      // Verify password
      const isValidPassword = await bcrypt.compare(password, creatorLogin.password);
      if (!isValidPassword) {
        console.log('Invalid password for creator:', username);
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Update last login timestamp
      await client.query(`
        UPDATE creator_logins 
        SET last_login = NOW(), updated_at = NOW()
        WHERE id = $1
      `, [creatorLogin.id]);

      console.log('Creator login successful:', username);

      // Return creator authentication data
      return res.status(200).json({
        success: true,
        creator: {
          id: creatorLogin.creator_id,
          username: creatorLogin.username,
          displayName: creatorLogin.display_name,
          email: creatorLogin.email
        }
      });
    }

    // GET /api/creator-auth/me - Get current creator info
    if (req.method === 'GET' && req.url.includes('/me')) {
      // For now, return not authenticated since we don't have session management
      return res.status(401).json({ message: 'Not authenticated' });
    }

    return res.status(405).json({ message: 'Method not allowed' });

  } catch (error) {
    console.error('Creator auth API error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  } finally {
    await client.end();
  }
}