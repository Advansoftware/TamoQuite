import { useQuery } from '@tanstack/react-query';
import { apiJson } from '@/lib/api';
import { qk } from '@/lib/query-keys';

interface InstallmentSummary {
  id: string;
  installmentNumber: number;
  dueDate: string;
  amount: number;
  status: string;
  paidAmount: number;
  borrowerName: string;
  borrowerWhatsapp: string;
  loanId: string;
}

export interface DashboardData {
  totalMonthly: number;
  totalMonthlyPending: number;
  receivedMonthly: number;
  upcomingInstallments: InstallmentSummary[];
  overdueInstallments: InstallmentSummary[];
  overdueCount: number;
  activeLoans: number;
  totalOutstanding: number;
  recentLoans: Array<{
    id: string;
    originalAmount: number;
    totalAmount: number;
    remainingAmount: number;
    status: string;
    createdAt: string;
    borrower: { name: string; whatsapp: string };
    _count: { installments: number };
  }>;
}

export function useDashboard() {
  return useQuery({
    queryKey: qk.dashboard,
    queryFn: () => apiJson<DashboardData>('/api/dashboard'),
  });
}
