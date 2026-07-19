import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { apiJson } from '@/lib/api';
import { qk } from '@/lib/query-keys';

export type ChargeType = 'REMINDER' | 'DUE' | 'OVERDUE' | 'MANUAL';
export type ChargeStatus = 'QUEUED' | 'SENT' | 'FAILED';
export type DeliveryStatus = 'DELIVERED' | 'READ' | null;

export interface ChargeHistoryItem {
  id: string;
  type: ChargeType;
  status: ChargeStatus;
  message: string;
  error: string | null;
  sentAt: string;
  deliveryStatus: DeliveryStatus;
  deliveredAt: string | null;
  readAt: string | null;
  loanId: string;
  installmentNumber: number;
  dueDate: string;
  amount: number;
  borrowerId: string;
  borrowerName: string;
  borrowerWhatsapp: string;
}

interface ChargeHistoryPage {
  items: ChargeHistoryItem[];
  nextCursor: string | null;
}

export interface ChargeHistorySummary {
  total: number;
  sent: number;
  failed: number;
  queued: number;
}

/** Paginated history of charges sent for the current user's own contracts. */
export function useChargeHistory(status?: string) {
  return useInfiniteQuery({
    queryKey: qk.chargeHistory(status),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => {
      const p = new URLSearchParams();
      if (status) p.set('status', status);
      if (pageParam) p.set('cursor', pageParam);
      const qs = p.toString();
      return apiJson<ChargeHistoryPage>(`/api/settings/billing/history${qs ? `?${qs}` : ''}`);
    },
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

export function useChargeHistorySummary() {
  return useQuery({
    queryKey: qk.chargeHistorySummary,
    queryFn: () => apiJson<ChargeHistorySummary>('/api/settings/billing/history/summary'),
  });
}
