// EMERGENCY PRODUCTION AUTHENTICATION FIX
// Direct connection to verified working backend
// Backend confirmed functional with 200 responses

export function getApiUrl(path: string = ''): string {
  const baseUrl = 'https://b911dd49-61eb-4d0b-b4c6-5c8fad3a1497-00-2d3umxy1xela5.spock.replit.dev';
  console.log(`Emergency auth fix: connecting to ${baseUrl}${path}`);
  return `${baseUrl}${path}`;
}

export async function apiRequest(method: string, url: string, data?: any): Promise<Response> {
  console.log(`Emergency auth request: ${method} ${getApiUrl(url)}`);
  
  const response = await fetch(getApiUrl(url), {
    method,
    headers: { 
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    credentials: 'include',
    body: data ? JSON.stringify(data) : undefined
  });
  
  console.log(`Emergency auth response: ${response.status} for ${url}`);
  
  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Authentication failed');
    console.error(`Emergency auth error: ${response.status} - ${errorText}`);
    throw new Error(`Authentication failed: ${response.status}`);
  }
  
  return response;
}