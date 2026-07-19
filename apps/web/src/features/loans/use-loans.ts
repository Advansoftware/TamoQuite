import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiJson, apiPost, resolveJson } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import type { LoanInput, LoanListItem } from './types';

export function useLoans() {
  return useQuery({
    queryKey: qk.loans,
    queryFn: () => apiJson<LoanListItem[]>('/api/loans'),
  });
}

/** Invalidate the queries a loan change can affect. Exposed so dialogs can refresh after create. */
export function useInvalidateLoans() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: qk.loans });
    qc.invalidateQueries({ queryKey: qk.dashboard });
    qc.invalidateQueries({ queryKey: qk.borrowers });
  };
}

export function useCreateLoan() {
  const invalidate = useInvalidateLoans();
  return useMutation({
    mutationFn: (input: LoanInput) => apiPost('/api/loans', input).then((r) => resolveJson<LoanListItem>(r)),
    onSuccess: invalidate,
  });
}

/**
 * Cancels a contract. Nothing is deleted — the installments, payments and
 * charge history stay, and the contract can be reactivated later.
 */
export function useCancelLoan() {
  const invalidate = useInvalidateLoans();
  return useMutation({
    mutationFn: (id: string) =>
      apiPost(`/api/loans/${id}/cancel`, {}).then((r) => resolveJson<LoanListItem>(r)),
    onSuccess: invalidate,
  });
}

export function useReactivateLoan() {
  const invalidate = useInvalidateLoans();
  return useMutation({
    mutationFn: (id: string) =>
      apiPost(`/api/loans/${id}/reactivate`, {}).then((r) => resolveJson<LoanListItem>(r)),
    onSuccess: invalidate,
  });
}
