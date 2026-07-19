export interface LoanInput {
  borrowerId: string;
  originalAmount: number;
  interestRate: number;
  /** The exact total the user asked for — the server stores it verbatim instead
   *  of re-deriving it from the 2-decimal rate (which drifts: 250 → 249,98). */
  totalAmount: number;
  installmentCount: number;
  frequency: string;
  startDate: string;
  /** Per-installment due dates (YYYY-MM-DD), in installment order. */
  dueDates?: string[];
}

/** Everything a contract correction can change. Omitted = keeps its value. */
export type LoanUpdateInput = Partial<LoanInput>;

export interface LoanListItem {
  id: string;
  borrowerId: string;
  originalAmount: number;
  interestRate: number;
  totalAmount: number;
  installmentCount: number;
  startDate: string;
  status: string;
  createdAt: string;
  borrower: { name: string; whatsapp: string };
  installments: Array<{ id: string; status: string; amount: number; paidAmount: number }>;
}
