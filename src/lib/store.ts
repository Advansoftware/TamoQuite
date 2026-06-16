import { create } from 'zustand';

export type View = 'dashboard' | 'borrowers' | 'loans' | 'loan-detail' | 'borrower-detail';

interface AppState {
  currentView: View;
  selectedLoanId: string | null;
  selectedBorrowerId: string | null;
  refreshKey: number;
  setView: (view: View) => void;
  selectLoan: (id: string) => void;
  selectBorrower: (id: string) => void;
  goBack: () => void;
  triggerRefresh: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  currentView: 'dashboard',
  selectedLoanId: null,
  selectedBorrowerId: null,
  refreshKey: 0,
  setView: (view) => set({ currentView: view, selectedLoanId: null, selectedBorrowerId: null }),
  selectLoan: (id) => set({ currentView: 'loan-detail', selectedLoanId: id }),
  selectBorrower: (id) => set({ currentView: 'borrower-detail', selectedBorrowerId: id }),
  goBack: () => set({ currentView: 'dashboard', selectedLoanId: null, selectedBorrowerId: null }),
  triggerRefresh: () => set((state) => ({ refreshKey: state.refreshKey + 1 })),
}));