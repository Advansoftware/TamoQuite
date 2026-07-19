import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiDelete, apiJson, apiPatch, apiPost, resolveJson } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import type { LoanInput, LoanListItem, LoanUpdateInput } from './types';

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
 * Corrects a contract created with the wrong numbers. Only the fields the user
 * changed are sent. The server rebuilds the parcelas, so it refuses money/date
 * changes once anything has been paid — that comes back as a normal API error.
 */
export function useUpdateLoan(loanId: string) {
  const invalidate = useInvalidateLoans();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: LoanUpdateInput) =>
      apiPatch(`/api/loans/${loanId}`, input).then((r) => resolveJson<LoanListItem>(r)),
    onSuccess: () => {
      invalidate();
      qc.invalidateQueries({ queryKey: ['loan', loanId] });
    },
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
