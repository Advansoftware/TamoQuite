import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiJson, apiPost, apiDelete, resolveJson } from '@/lib/api';
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

export function useDeleteLoan() {
  const invalidate = useInvalidateLoans();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/api/loans/${id}`).then((r) => resolveJson<{ success: boolean }>(r)),
    onSuccess: invalidate,
  });
}
