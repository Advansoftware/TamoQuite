// Central factory of React Query keys — one source of truth so invalidation is consistent.
export const qk = {
  borrowers: ['borrowers'] as const,
  borrower: (id: string) => ['borrowers', id] as const,
  loans: ['loans'] as const,
  loan: (id: string) => ['loans', id] as const,
  dashboard: ['dashboard'] as const,
  subscription: ['subscription'] as const,
  me: ['me'] as const,
};
