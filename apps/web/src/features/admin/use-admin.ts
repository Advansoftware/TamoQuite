import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiJson, apiPost, apiDelete, resolveJson } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import type { Coupon, CreateCouponInput, CreateUserInput, ManagedUser } from './types';

export function useAdminUsers(status: 'active' | 'inactive' | 'all' = 'active') {
  return useQuery({
    queryKey: qk.adminUsersByStatus(status),
    queryFn: () => apiJson<ManagedUser[]>(`/api/admin/users?status=${status}`),
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateUserInput) =>
      apiPost('/api/auth/register', input).then((r) => resolveJson<ManagedUser>(r)),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.adminUsers }),
  });
}

export function useDeactivateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (targetUserId: string) =>
      apiDelete('/api/admin/users', { targetUserId }).then((r) => resolveJson<{ success: boolean }>(r)),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.adminUsers }),
  });
}

export function useReactivateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      apiPost(`/api/admin/users/${userId}/reactivate`, {}).then((r) => resolveJson<{ success: boolean }>(r)),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.adminUsers }),
  });
}

export function useResetTrial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      apiPost(`/api/admin/billing/users/${userId}/reset-trial`, {}).then((r) => resolveJson<unknown>(r)),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.adminUsers }),
  });
}

export function useCoupons(enabled: boolean) {
  return useQuery({
    queryKey: qk.adminCoupons,
    queryFn: () => apiJson<Coupon[]>('/api/admin/billing/coupons'),
    enabled,
  });
}

export function useCreateCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCouponInput) =>
      apiPost('/api/admin/billing/coupons', input).then((r) => resolveJson<Coupon>(r)),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.adminCoupons }),
  });
}

export function useApplyCoupon() {
  return useMutation({
    mutationFn: ({ userId, couponId }: { userId: string; couponId: string }) =>
      apiPost(`/api/admin/billing/users/${userId}/apply-coupon`, { couponId }).then((r) =>
        resolveJson<unknown>(r),
      ),
  });
}
