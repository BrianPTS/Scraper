/**
 * API service for handling requests
 * Uses environment variable in local dev, or relative URLs in production
 */

// Get the base URL from environment variable (only used in local development)
const baseUrl = import.meta.env.VITE_API_URL;

/**
 * Makes API requests with proper URL handling based on environment
 * @param {string} endpoint - API endpoint (should start with /)
 * @param {Object} options - Fetch options
 * @returns {Promise} - Fetch promise
 */
export const apiRequest = async (endpoint, options = {}) => {
  // If baseUrl is set (local development), use it
  // Otherwise use relative URLs which will work with nginx in production
  const url = baseUrl ? `${baseUrl}${endpoint}` : endpoint;
  
  return fetch(url, options);
};

/**
 * GET request helper
 * @param {string} endpoint - API endpoint
 * @returns {Promise} - Fetch promise
 */
export const get = (endpoint) => {
  return apiRequest(endpoint);
};

/**
 * POST request helper
 * @param {string} endpoint - API endpoint
 * @param {Object} data - Data to send
 * @returns {Promise} - Fetch promise
 */
export const post = (endpoint, data) => {
  return apiRequest(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
};

/**
 * DELETE request helper
 * @param {string} endpoint - API endpoint
 * @returns {Promise} - Fetch promise
 */
export const del = (endpoint) => {
  return apiRequest(endpoint, {
    method: 'DELETE',
  });
}; 