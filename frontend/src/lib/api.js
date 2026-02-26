/**
 * Base URL for all API requests.
 *
 * In development: reads from VITE_API_URL in .env (defaults to localhost:8000)
 * In production:  reads from VITE_API_URL in .env.production
 */
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';