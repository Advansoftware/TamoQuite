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
