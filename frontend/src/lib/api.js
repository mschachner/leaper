/**
 * Base URL for all API requests.
 *
 * In development: reads from VITE_API_URL in .env (defaults to localhost:8000)
 * In production:  reads from VITE_API_URL in .env.production
 */
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Check if the backend API is reachable.
 * Returns true if healthy, false otherwise.
 */
export async function checkHealth() {
    try {
      const resp = await fetch(`${API_URL}/health`, {
        signal: AbortSignal.timeout(5000),  // 5 second timeout
      });
      return resp.ok;
    } catch {
      return false;
    }
  }