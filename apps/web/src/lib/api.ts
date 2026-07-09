// Standalone API helper - reads token from Zustand (or localStorage) and targets the NestJS API base URL.
import { useAppStore } from '@/lib/store';
import { apiUrl, getStoredToken } from '@/lib/config';

function currentToken(): string | null {
  return useAppStore.getState().token || getStoredToken();
}

export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = currentToken();
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(apiUrl(url), { ...options, headers, credentials: 'include' });
}

export async function apiPost(url: string, body: unknown): Promise<Response> {
  return apiFetch(url, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function apiDelete(url: string, body?: unknown): Promise<Response> {
  if (body) {
    return apiFetch(url, { method: 'DELETE', body: JSON.stringify(body) });
  }
  return apiFetch(url, { method: 'DELETE' });
}

export async function apiPut(url: string, body: unknown): Promise<Response> {
  return apiFetch(url, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function apiPatch(url: string, body: unknown): Promise<Response> {
  return apiFetch(url, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

/**
 * Handles API error responses with appropriate user-facing messages.
 * Returns the error message string, or null if the response was OK.
 */
export async function getApiError(res: Response): Promise<string | null> {
  if (res.ok) return null;

  if (res.status === 401) {
    return 'Sessão expirada. Faça login novamente.';
  }

  if (res.status === 403) {
    return 'Você não tem permissão para esta ação.';
  }

  if (res.status === 404) {
    return 'Recurso não encontrado.';
  }

  if (res.status === 400 || res.status === 422) {
    try {
      const data = await res.json();
      return data.error || data.message || 'Dados inválidos. Verifique os campos.';
    } catch {
      return 'Dados inválidos. Verifique os campos.';
    }
  }

  try {
    const data = await res.json();
    return data.error || data.message || 'Erro no servidor. Tente novamente.';
  } catch {
    return 'Erro no servidor. Tente novamente.';
  }
}
