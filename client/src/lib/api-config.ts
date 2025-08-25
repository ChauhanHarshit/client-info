// Production authentication fix - use dynamic domain detection
export function getApiUrl(path: string): string {
  // Always use same-origin endpoints to avoid CORS issues
  if (typeof window !== 'undefined') {
    return path; // Same-origin request for all environments
  }
  
  // For server-side rendering, use localhost
  return `http://localhost:5000${path}`;
}

export async function apiRequest(method: string, url: string, data?: any) {
  // Use same-origin requests to avoid CORS issues
  const fullUrl = url;
  
  const response = await fetch(fullUrl, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache'
    },
    credentials: 'include',
    body: data ? JSON.stringify(data) : undefined,
  });
  
  const responseData = await response.json();
  
  if (!response.ok) {
    throw new Error(responseData.message || 'Request failed');
  }
  
  return responseData;
}