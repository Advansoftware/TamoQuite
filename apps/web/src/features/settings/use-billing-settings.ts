import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiJson, apiPut, resolveJson } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import type { BillingSettings } from './types';

/** Billing/charging settings — shared by the WhatsApp and Cobrança tabs (single fetch). */
export function useBillingSettings() {
  return useQuery({
    queryKey: qk.billingSettings,
    queryFn: () => apiJson<BillingSettings>('/api/settings/billing'),
  });
}

export function useUpdateBillingSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<BillingSettings>) =>
      apiPut('/api/settings/billing', patch).then((r) => resolveJson<BillingSettings>(r)),
    // Keep the cache authoritative so both tabs reflect the change.
    onSuccess: (fresh) => qc.setQueryData(qk.billingSettings, fresh),
  });
}
