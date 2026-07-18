import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiJson, apiPost, apiPut, apiDelete, resolveJson } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import type { Borrower, BorrowerDetail, BorrowerInput } from './types';

export function useBorrowers() {
  return useQuery({
    queryKey: qk.borrowers,
    queryFn: () => apiJson<Borrower[]>('/api/borrowers'),
  });
}

export function useBorrower(id: string | undefined) {
  return useQuery({
    queryKey: qk.borrower(id ?? ''),
    queryFn: () => apiJson<BorrowerDetail>(`/api/borrowers/${id}`),
    enabled: !!id,
  });
}

/** Invalidates the lists that a borrower change can affect. */
function useInvalidateBorrowers() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: qk.borrowers });
    qc.invalidateQueries({ queryKey: qk.dashboard });
  };
}

export function useCreateBorrower() {
  const invalidate = useInvalidateBorrowers();
  return useMutation({
    mutationFn: (input: BorrowerInput) => apiPost('/api/borrowers', input).then((r) => resolveJson<Borrower>(r)),
    onSuccess: invalidate,
  });
}

export function useUpdateBorrower() {
  const invalidate = useInvalidateBorrowers();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: BorrowerInput }) =>
      apiPut(`/api/borrowers/${id}`, input).then((r) => resolveJson<Borrower>(r)),
    onSuccess: invalidate,
  });
}

export function useDeleteBorrower() {
  const invalidate = useInvalidateBorrowers();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/api/borrowers/${id}`).then((r) => resolveJson<{ success: boolean }>(r)),
    onSuccess: invalidate,
  });
}
