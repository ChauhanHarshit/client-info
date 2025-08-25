// Vercel serverless function for creators API
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
      // Fetch all creators
      const result = await client.query(`
        SELECT 
          id,
          username,
          display_name as "displayName",
          email,
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM creators
        ORDER BY created_at DESC
      `);

      return res.status(200).json(result.rows);
    }

    if (req.method === 'POST') {
      // Create new creator
      const { username, displayName, email } = req.body;
      
      // Check if username already exists
      const existingCreator = await client.query(
        'SELECT id FROM creators WHERE username = $1', 
        [username]
      );
      
      if (existingCreator.rows.length > 0) {
        return res.status(400).json({ message: 'Username already exists' });
      }

      // Create creator
      const result = await client.query(`
        INSERT INTO creators (username, display_name, email, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), NOW())
        RETURNING id, username, display_name as "displayName", email, created_at as "createdAt", updated_at as "updatedAt"
      `, [username, displayName, email]);

      // Generate setup token for password creation
      const setupToken = require('crypto').randomBytes(32).toString('hex');
      
      // Create creator login entry with setup token
      await client.query(`
        INSERT INTO creator_logins (creator_id, username, password, is_active, setup_token, created_at, updated_at, created_by)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), $6)
      `, [result.rows[0].id, username, 'temp_hash', true, setupToken, 'tastyyyy-admin']);

      // Send setup email (import the email service)
      try {
        const { sendCreatorSetupEmail } = require('../server/emailService.ts');
        await sendCreatorSetupEmail(email, username, setupToken);
        console.log(`creator_setup email sent successfully to ${email}`);
      } catch (emailError) {
        console.error('Failed to send setup email:', emailError);
      }

      return res.status(201).json(result.rows[0]);
    }

    if (req.method === 'PUT') {
      // Update creator
      const { id } = req.query;
      const { username, displayName, email } = req.body;
      
      const result = await client.query(`
        UPDATE creators 
        SET username = $1, display_name = $2, email = $3, updated_at = NOW()
        WHERE id = $4
        RETURNING id, username, display_name as "displayName", email, updated_at as "updatedAt"
      `, [username, displayName, email, id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Creator not found' });
      }

      return res.status(200).json(result.rows[0]);
    }

    if (req.method === 'DELETE') {
      // Delete creator
      const { id } = req.query;
      
      // Delete creator login first (foreign key constraint)
      await client.query('DELETE FROM creator_logins WHERE creator_id = $1', [id]);
      
      // Delete creator
      const result = await client.query('DELETE FROM creators WHERE id = $1 RETURNING id', [id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Creator not found' });
      }

      return res.status(200).json({ message: 'Creator deleted successfully' });
    }

    return res.status(405).json({ message: 'Method not allowed' });

  } catch (error) {
    console.error('Creators API error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  } finally {
    await client.end();
  }
}