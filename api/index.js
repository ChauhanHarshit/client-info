// Vercel serverless function - Production deployment fix
export default async function handler(req, res) {
  // Forward all requests to working Replit backend
  const backendUrl = 'https://b911dd49-61eb-4d0b-b4c6-5c8fad3a1497-00-2d3umxy1xela5.spock.replit.dev';
  
  try {
    const response = await fetch(`${backendUrl}${req.url}`, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': req.headers.cookie || ''
      },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
    });

    const data = await response.text();
    
    // Forward response headers
    Object.entries(response.headers.entries()).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    
    res.status(response.status).send(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Backend connection failed' });
  }
}