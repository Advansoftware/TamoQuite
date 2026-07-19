import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiDelete, apiJson, apiPost, resolveJson } from '@/lib/api';
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
 * Deletes a contract. It disappears from the app along with its parcelas and
 * cobranças, and stops counting towards every total. The rows are kept in the
 * database for auditing only — there is no way to bring one back.
 */
export function useDeleteLoan() {
  const invalidate = useInvalidateLoans();
  return useMutation({
    mutationFn: (id: string) =>
      apiDelete(`/api/loans/${id}`).then((r) => resolveJson<{ success: true }>(r)),
    onSuccess: invalidate,
  });
}
