'use client';

import { useEffect, useRef } from 'react';
import { apiFetch } from '@/lib/api';
import { useAppStore } from '@/lib/store';

/**
 * Bootstraps auth on the client: hydrates the persisted Bearer token from localStorage,
 * then resolves the current user via /auth/me. Runs once for the whole app so every route
 * (including deep-linked/reloaded ones) shares the same auth state.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setUser = useAppStore((s) => s.setUser);
  const hydrateToken = useAppStore((s) => s.hydrateToken);
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;

    hydrateToken();

    (async () => {
      try {
        const res = await apiFetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUser(data);
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      }
    })();
  }, [setUser, hydrateToken]);

  return <>{children}</>;
}
