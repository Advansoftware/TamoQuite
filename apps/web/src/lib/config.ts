// Resolves the base URL of the NestJS API.
// Priority: runtime-injected window.__API_URL__ (set in the root layout from the
// server's API_URL env — changeable without a rebuild) → build-time NEXT_PUBLIC_API_URL → same origin.
declare global {
  interface Window {
    __API_URL__?: string;
  }
}

export function getApiBase(): string {
  if (typeof window !== 'undefined' && window.__API_URL__) {
    return window.__API_URL__;
  }
  return process.env.NEXT_PUBLIC_API_URL || '';
}

export function apiUrl(path: string): string {
  const base = getApiBase().replace(/\/$/, '');
  if (!base) return path;
  return path.startsWith('/') ? `${base}${path}` : `${base}/${path}`;
}

const TOKEN_KEY = 'tq_token';

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}
