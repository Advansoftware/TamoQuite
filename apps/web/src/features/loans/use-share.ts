import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiDelete, apiJson, apiPost, resolveJson } from '@/lib/api';
import { qk } from '@/lib/query-keys';

export interface ShareState {
  active: boolean;
  token?: string;
  createdAt?: string;
  viewCount?: number;
  lastViewedAt?: string | null;
}

export function useShare(loanId: string) {
  return useQuery({
    queryKey: qk.loanShare(loanId),
    queryFn: () => apiJson<ShareState>(`/api/loans/${loanId}/share`),
  });
}

export function useEnableShare(loanId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiPost(`/api/loans/${loanId}/share`, {}).then((r) => resolveJson<ShareState>(r)),
    onSuccess: (data) => qc.setQueryData(qk.loanShare(loanId), data),
  });
}

export function useRevokeShare(loanId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiDelete(`/api/loans/${loanId}/share`).then((r) => resolveJson<ShareState>(r)),
    onSuccess: (data) => qc.setQueryData(qk.loanShare(loanId), data),
  });
}

/** Absolute URL a debtor can open — built from the browser origin, not an env. */
export function shareUrl(token: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/share/${token}`;
}
