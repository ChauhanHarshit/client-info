// Vercel-compatible authentication with direct database access
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

// Create MySQL connection for PlanetScale
async function createConnection() {
  return await mysql.createConnection(process.env.DATABASE_URL);
}

module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', 'https://tastyyyy.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { path } = req.query;
  
  try {
    // Handle login endpoint directly with PlanetScale
    if (path === 'login' && req.method === 'POST') {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password required' });
      }

      // Query PlanetScale database directly
      const connection = await createConnection();
      const [rows] = await connection.execute(
        'SELECT * FROM User WHERE email = ?',
        [email.toLowerCase()]
      );
      
      await connection.end();

      if (!rows || rows.length === 0) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const user = rows[0];

      // Verify password with bcrypt
      const passwordValid = await bcrypt.compare(password, user.password);
      
      if (!passwordValid) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Create session data
      const sessionData = {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name
      };

      // Set session cookie
      res.setHeader('Set-Cookie', [
        `session=${JSON.stringify(sessionData)}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=86400`,
        `authenticated=true; Path=/; Secure; SameSite=None; Max-Age=86400`
      ]);

      return res.status(200).json({ 
        success: true, 
        user: sessionData,
        message: 'Login successful'
      });
    }

    // Handle user info endpoint
    if (path === 'user' && req.method === 'GET') {
      const sessionCookie = req.headers.cookie?.split(';')
        .find(cookie => cookie.trim().startsWith('session='))
        ?.split('=')[1];

      if (!sessionCookie) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      try {
        const userData = JSON.parse(decodeURIComponent(sessionCookie));
        return res.status(200).json({ user: userData });
      } catch (e) {
        return res.status(401).json({ message: 'Invalid session' });
      }
    }

    // Handle logout
    if (path === 'logout' && req.method === 'POST') {
      res.setHeader('Set-Cookie', [
        'session=; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=0',
        'authenticated=; Path=/; Secure; SameSite=None; Max-Age=0'
      ]);
      return res.status(200).json({ success: true });
    }

    // Default fallback
    return res.status(404).json({ message: 'Endpoint not found' });

  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({ 
      message: 'Authentication service error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};