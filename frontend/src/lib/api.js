/**
 * Base URL for all API requests.
 * 
 * In development: reads from VITE_API_URL in .env (defaults to localhost:8000)
 * In production: reads from VITE_API_URL in .env.production
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Make a POST request to the API.
 * Returns the parsed JSON response.
 */

export async function apiPost(path, body) {
    const resp = await fetch(`${API_URL}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`API error (${resp.status}): ${text}`);
    }

    return resp.json();
}

/**
 * Make a GET request to the API.
 */
export async function apiGet(path) {
    const resp = await fetch(`${API_URL}${path}`);

    if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`API error (${resp.status}): ${text}`);
    }

    return resp.json();
}