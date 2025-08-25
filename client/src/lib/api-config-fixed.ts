export function getApiUrl(path: string = ''): string {
  return `https://b911dd49-61eb-4d0b-b4c6-5c8fad3a1497-00-2d3umxy1xela5.spock.replit.dev${path}`;
}

export async function apiRequest(method: string, url: string, data?: any): Promise<Response> {
  const response = await fetch(getApiUrl(url), {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: data ? JSON.stringify(data) : undefined
  });
  
  if (!response.ok) {
    throw new Error('Authentication failed');
  }
  
  return response;
}