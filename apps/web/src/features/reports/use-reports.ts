import { useQuery } from '@tanstack/react-query';
import { apiJson } from '@/lib/api';
import { qk } from '@/lib/query-keys';

export interface ReportSummary {
  totals: {
    activeContracts: number;
    totalContracts: number;
    totalLent: number;
    totalReceived: number;
    outstanding: number;
    /** Juros previstos: o que entra além do valor emprestado. */
    expectedProfit: number;
  };
  byStatus: { ACTIVE: number; COMPLETED: number; CANCELED: number };
  monthly: { key: string; label: string; received: number }[];
}

/** Figures for the reports screen — always the caller's own contracts. */
export function useReportSummary(months: number) {
  return useQuery({
    queryKey: qk.reportSummary(months),
    queryFn: () => apiJson<ReportSummary>(`/api/reports/summary?months=${months}`),
  });
}
