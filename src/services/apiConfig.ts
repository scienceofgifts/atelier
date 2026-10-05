/**
 * Resolves the base URL for Atelier's dedicated Gemini API Worker.
 * When VITE_GEMINI_API_URL is configured (e.g. https://atelier-api.scienceofgifts.workers.dev),
 * requests will target the dedicated Worker directly.
 * Falls back to relative '/api' for local development proxying.
 */
export function getApiUrl(path: string): string {
  const envUrl = import.meta.env.VITE_GEMINI_API_URL;
  const baseUrl = envUrl && String(envUrl).trim() !== '' && String(envUrl).trim() !== '""'
    ? String(envUrl).trim().replace(/^["']|["']$/g, '').replace(/\/+$/, '')
    : '';

  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return baseUrl ? `${baseUrl}${cleanPath}` : cleanPath;
}
