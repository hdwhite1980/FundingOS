/**
 * API URL Utility - Handles client-side vs server-side URL resolution
 * 
 * In production, server-side code needs absolute URLs for fetch calls
 * while client-side code can use relative URLs
 */

/**
 * Get the base URL for API calls
 * @returns {string} Base URL for API endpoints
 */
export function getApiBaseUrl() {
  // Check if we're on the server side
  if (typeof window === 'undefined') {
    // Server-side: Use environment variable or construct from headers
    return process.env.NEXTAUTH_URL || 
           process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` :
           'http://localhost:3000'
  }
  
  // Client-side: Use relative URLs or window.location
  return window.location.origin
}

/**
 * Resolve API endpoint URL (handles both client and server side)
 * @param {string} endpoint - The API endpoint path (e.g., '/api/ai/scoring')
 * @returns {string} Complete URL for the endpoint
 */
export function resolveApiUrl(endpoint) {
  // If it's already an absolute URL, return as-is
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint
  }
  
  // For relative URLs, prepend the base URL when on server side
  if (typeof window === 'undefined') {
    const baseUrl = getApiBaseUrl()
    return `${baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`
  }
  
  // Client-side can use relative URLs
  return endpoint
}

export default { getApiBaseUrl, resolveApiUrl }