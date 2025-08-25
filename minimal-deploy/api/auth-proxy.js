const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

async function createConnection() {
  return await mysql.createConnection(process.env.DATABASE_URL);
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { path } = req.query;
  
  try {
    if (path?.[0] === 'login' && req.method === 'POST') {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password required' });
      }

      const connection = await createConnection();
      const [rows] = await connection.execute('SELECT * FROM User WHERE email = ?', [email.toLowerCase()]);
      await connection.end();

      if (!rows || rows.length === 0) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const user = rows[0];
      const passwordValid = await bcrypt.compare(password, user.password);
      
      if (!passwordValid) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const sessionData = { id: user.id, email: user.email, role: user.role, name: user.name };

      res.setHeader('Set-Cookie', [
        `session=${JSON.stringify(sessionData)}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=86400`,
        `authenticated=true; Path=/; Secure; SameSite=None; Max-Age=86400`
      ]);

      return res.status(200).json({ success: true, user: sessionData, message: 'Login successful' });
    }

    if (path?.[0] === 'user' && req.method === 'GET') {
      const sessionCookie = req.headers.cookie?.split(';').find(cookie => cookie.trim().startsWith('session='))?.split('=')[1];

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

    if (path?.[0] === 'logout' && req.method === 'POST') {
      res.setHeader('Set-Cookie', [
        'session=; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=0',
        'authenticated=; Path=/; Secure; SameSite=None; Max-Age=0'
      ]);
      return res.status(200).json({ success: true });
    }

    return res.status(404).json({ message: 'Endpoint not found' });

  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({ message: 'Authentication service error' });
  }
};