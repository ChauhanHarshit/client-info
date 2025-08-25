// Vercel serverless function for admin login
import { Client } from 'pg';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  // Enable CORS for production
  res.setHeader('Access-Control-Allow-Origin', 'https://tastyyyy.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  // Connect to PostgreSQL database
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();

    // Check for admin user
    if (email === 'carter@tastyyyy.com' && password === 'admin123') {
      // Set authentication cookie
      res.setHeader('Set-Cookie', [
        'connect.sid=tastyyyy-authenticated; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000',
        'crm_session_active=true; Secure; SameSite=Lax; Path=/; Max-Age=2592000'
      ]);

      return res.status(200).json({
        id: '9ca0121c-207e-49b2-98c3-01aa5c1375c0',
        email: 'carter@tastyyyy.com',
        name: 'Carter Admin',
        role: 'admin',
        has_mass_access: true
      });
    }

    return res.status(401).json({ message: 'Invalid credentials' });

  } catch (error) {
    console.error('Login API error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  } finally {
    await client.end();
  }
}