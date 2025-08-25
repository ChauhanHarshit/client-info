// API Configuration - Use same-origin requests to avoid CORS issues
export const API_BASE_URL = (() => {
  if (typeof window === 'undefined') {
    // Server-side rendering
    return 'http://localhost:5000';
  }
  
  // Always use same origin for client-side requests to avoid CORS
  return window.location.origin;
})();

export const getApiUrl = (path: string) => {
  // For client-side requests, use relative paths to avoid CORS issues
  if (typeof window !== 'undefined') {
    return path.startsWith('/') ? path : `/${path}`;
  }
  
  // For server-side, use full URL
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  const fullUrl = `${API_BASE_URL}/${cleanPath}`;
  return fullUrl;
};