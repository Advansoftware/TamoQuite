export interface Borrower {
  id: string;
  name: string;
  whatsapp: string;
  notes: string | null;
  createdAt: string;
  _count: { loans: number };
  loans?: Array<{
    installments: Array<{ status: string }>;
  }>;
}

export interface BorrowerInput {
  name: string;
  whatsapp: string;
  notes?: string;
}

export interface BorrowerDetail {
  id: string;
  name: string;
  whatsapp: string;
  notes: string | null;
  createdAt: string;
  /** false → os contratos abaixo estão ocultos no resto do app e não são cobrados. */
  isActive: boolean;
  loans: Array<{
    id: string;
    originalAmount: number;
    totalAmount: number;
    status: string;
    startDate: string;
    installmentCount: number;
    installments: Array<{
      id: string;
      status: string;
      amount: number;
      paidAmount: number;
      installmentNumber: number;
      dueDate: string;
    }>;
  }>;
}
