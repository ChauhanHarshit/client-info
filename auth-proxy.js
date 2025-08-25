export default async function handler(req, res) {
  // EMERGENCY PRODUCTION AUTHENTICATION PROXY
  // Direct connection to verified working backend
  const backendUrl = 'https://b911dd49-61eb-4d0b-b4c6-5c8fad3a1497-00-2d3umxy1xela5.spock.replit.dev';
  
  // Enable CORS for production domains
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    const targetUrl = `${backendUrl}${req.url}`;
    
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': req.headers.cookie || '',
        'User-Agent': req.headers['user-agent'] || '',
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined
    });

    // Forward all response headers
    for (const [key, value] of response.headers.entries()) {
      res.setHeader(key, value);
    }
    
    const data = await response.text();
    res.status(response.status).send(data);
    
  } catch (error) {
    console.error('Authentication proxy error:', error);
    res.status(500).json({ 
      error: 'Authentication proxy failed',
      message: 'Backend connection error'
    });
  }
}