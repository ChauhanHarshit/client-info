// Vercel serverless function for creator setup API
import { Client } from 'pg';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', 'https://tastyyyy.com');
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

    // GET /api/creator-setup/verify - Verify setup token
    if (req.method === 'GET' && req.url.includes('/verify')) {
      const url = new URL(req.url, `https://${req.headers.host}`);
      const token = url.searchParams.get('token');

      if (!token) {
        return res.status(400).json({ message: 'Token is required' });
      }

      // Find creator login by setup token
      const result = await client.query(`
        SELECT cl.username, c.display_name as displayName, c.email
        FROM creator_logins cl
        JOIN creators c ON cl.creator_id = c.id
        WHERE cl.setup_token = $1 AND cl.is_active = true
      `, [token]);

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Invalid or expired setup token' });
      }

      const creator = result.rows[0];
      return res.status(200).json({
        username: creator.username,
        displayName: creator.displayname,
        email: creator.email
      });
    }

    // POST /api/creator-setup/complete - Complete setup process
    if (req.method === 'POST') {
      const { token, password } = req.body;

      if (!token || !password) {
        return res.status(400).json({ message: 'Token and password are required' });
      }

      // Find creator login by setup token
      const findResult = await client.query(`
        SELECT cl.id, cl.username, cl.creator_id
        FROM creator_logins cl
        WHERE cl.setup_token = $1 AND cl.is_active = true
      `, [token]);

      if (findResult.rows.length === 0) {
        return res.status(404).json({ message: 'Invalid or expired setup token' });
      }

      const creatorLogin = findResult.rows[0];

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Update creator login with new password and clear setup token
      await client.query(`
        UPDATE creator_logins 
        SET password = $1, setup_token = NULL, updated_at = NOW()
        WHERE id = $2
      `, [hashedPassword, creatorLogin.id]);

      return res.status(200).json({
        message: 'Password setup completed successfully',
        username: creatorLogin.username
      });
    }

    return res.status(405).json({ message: 'Method not allowed' });

  } catch (error) {
    console.error('Creator setup API error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  } finally {
    await client.end();
  }
}