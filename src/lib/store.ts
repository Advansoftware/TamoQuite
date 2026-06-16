import { create } from 'zustand';

export type View = 'dashboard' | 'borrowers' | 'loans' | 'loan-detail' | 'borrower-detail' | 'admin' | 'admin-user-dashboard';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  mustChangePassword: boolean;
  subscriptionStatus: string | null;
}

interface AppState {
  // Auth
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: AuthUser | null, token?: string | null) => void;
  logout: () => void;

  // Navigation
  currentView: View;
  selectedLoanId: string | null;
  selectedBorrowerId: string | null;
  adminSelectedUserId: string | null;
  refreshKey: number;
  setView: (view: View) => void;
  selectLoan: (id: string) => void;
  selectBorrower: (id: string) => void;
  selectAdminUser: (id: string) => void;
  goBack: () => void;
  triggerRefresh: () => void;
}

// Helper: get auth headers for fetch calls
export function authHeaders(): Record<string, string> {
  const state = useAppStore.getState();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (state.token) {
    headers['Authorization'] = `Bearer ${state.token}`;
  }
  return headers;
}

// Helper: authenticated fetch
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = useAppStore.getState().token;
  const headers = new Headers(options.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(url, { ...options, headers });
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  setUser: (user, token = null) => set({
    user,
    token: user ? (token || useAppStore.getState().token) : null,
    isAuthenticated: !!user,
    isLoading: false,
  }),
  logout: () => {
    if (typeof window !== 'undefined') {
      document.cookie = 'cf_session=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    }
    set({ user: null, token: null, isAuthenticated: false, currentView: 'dashboard' });
  },

  currentView: 'dashboard',
  selectedLoanId: null,
  selectedBorrowerId: null,
  adminSelectedUserId: null,
  refreshKey: 0,
  setView: (view) => set({ currentView: view, selectedLoanId: null, selectedBorrowerId: null, adminSelectedUserId: null }),
  selectLoan: (id) => set({ currentView: 'loan-detail', selectedLoanId: id }),
  selectBorrower: (id) => set({ currentView: 'borrower-detail', selectedBorrowerId: id }),
  selectAdminUser: (id) => set({ currentView: 'admin-user-dashboard', adminSelectedUserId: id }),
  goBack: () => set({ currentView: 'dashboard', selectedLoanId: null, selectedBorrowerId: null, adminSelectedUserId: null }),
  triggerRefresh: () => set((state) => ({ refreshKey: state.refreshKey + 1 })),
}));