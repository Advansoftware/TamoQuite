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
