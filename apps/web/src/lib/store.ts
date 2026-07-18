import { create } from 'zustand';
import { apiUrl, getStoredToken, setStoredToken } from '@/lib/config';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  mustChangePassword: boolean;
  subscriptionStatus: string | null;
  notifyBeforeSubExpiryDays?: number;
}

interface AppState {
  // Auth
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: AuthUser | null, token?: string | null) => void;
  hydrateToken: () => void;
  logout: () => void;
  markSubscriptionInactive: () => void;

  // UI (non-route) state
  loansFilter: string;
  setLoansFilter: (filter: string) => void;
}

// Helper: get auth headers for fetch calls
export function authHeaders(): Record<string, string> {
  const token = useAppStore.getState().token || getStoredToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// Helper: authenticated fetch against the API base URL
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = useAppStore.getState().token || getStoredToken();
  const headers = new Headers(options.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(apiUrl(url), { ...options, headers, credentials: 'include' });
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  setUser: (user, token = null) => {
    const resolvedToken = user ? token || useAppStore.getState().token || getStoredToken() : null;
    setStoredToken(resolvedToken);
    set({
      user,
      token: resolvedToken,
      isAuthenticated: !!user,
      isLoading: false,
    });
  },
  hydrateToken: () => {
    const token = getStoredToken();
    if (token) set({ token });
  },
  // Flips the cached user to an inactive subscription so the app-layout paywall
  // renders immediately when an API call reports the subscription is inactive.
  markSubscriptionInactive: () =>
    set((state) =>
      state.user && state.user.subscriptionStatus !== 'INACTIVE'
        ? { user: { ...state.user, subscriptionStatus: 'INACTIVE' } }
        : {},
    ),
  logout: () => {
    setStoredToken(null);
    if (typeof window !== 'undefined') {
      document.cookie = 'cf_session=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    }
    set({ user: null, token: null, isAuthenticated: false });
  },

  loansFilter: 'ALL',
  setLoansFilter: (filter) => set({ loansFilter: filter }),
}));
