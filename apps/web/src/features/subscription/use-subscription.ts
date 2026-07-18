import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiJson, apiPost, apiPut, resolveJson } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import { useAppStore } from '@/lib/store';
import type { SubscriptionInfo } from './types';

export function useSubscription() {
  return useQuery({
    queryKey: qk.subscription,
    queryFn: () => apiJson<SubscriptionInfo>('/api/stripe/subscription'),
  });
}

/** Opens the Stripe billing portal by redirecting the browser to the returned URL. */
export function useOpenBillingPortal() {
  return useMutation({
    mutationFn: async () => {
      const { url } = await apiPost('/api/stripe/portal', {}).then((r) => resolveJson<{ url: string }>(r));
      window.location.href = url;
    },
  });
}

/** Persists the "warn N days before expiry" preference and syncs it into the cached user. */
export function useUpdateNotifyDays() {
  const qc = useQueryClient();
  const { user, setUser } = useAppStore();
  return useMutation({
    mutationFn: (days: number) =>
      apiPut('/api/auth/notification-prefs', { notifyBeforeSubExpiryDays: days }).then((r) =>
        resolveJson<{ success: boolean }>(r),
      ),
    onSuccess: (_data, days) => {
      if (user) setUser({ ...user, notifyBeforeSubExpiryDays: Math.round(days) });
      qc.invalidateQueries({ queryKey: qk.me });
    },
  });
}
