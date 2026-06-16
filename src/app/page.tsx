'use client';

import { BottomNav, TopBar } from '@/components/loan-system/Navigation';
import { DashboardView } from '@/components/loan-system/DashboardView';
import { BorrowersView } from '@/components/loan-system/BorrowersView';
import { LoansView } from '@/components/loan-system/LoansView';
import { LoanDetailView } from '@/components/loan-system/LoanDetailView';
import { BorrowerDetailView } from '@/components/loan-system/BorrowerDetailView';
import { useAppStore } from '@/lib/store';
import { Zap } from 'lucide-react';

export default function Home() {
  const { currentView } = useAppStore();

  const getTitle = () => {
    switch (currentView) {
      case 'dashboard': return null;
      case 'borrowers': return null;
      case 'loans': return null;
      case 'loan-detail': return 'Detalhes do Empréstimo';
      case 'borrower-detail': return 'Detalhes da Pessoa';
      default: return null;
    }
  };

  const showBack = currentView === 'loan-detail' || currentView === 'borrower-detail';

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Logo bar */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-lg mx-auto flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-2.5">
            {showBack && (
              <button
                onClick={useAppStore.getState().goBack}
                className="flex items-center justify-center w-9 h-9 rounded-xl bg-secondary hover:bg-surface-elevated transition-colors -ml-1.5 mr-1"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-neon flex items-center justify-center shadow-[0_0_12px_rgba(0,255,163,0.3)]">
                <Zap className="w-4 h-4 text-background" />
              </div>
              <span className="text-base font-bold text-foreground tracking-tight">CashFlow</span>
            </div>
          </div>
          <div className="text-xs text-muted-foreground hidden sm:block">
            Gestão de Repasses
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 pt-4 pb-24">
        {currentView === 'dashboard' && <DashboardView />}
        {currentView === 'borrowers' && <BorrowersView />}
        {currentView === 'loans' && <LoansView />}
        {currentView === 'loan-detail' && <LoanDetailView />}
        {currentView === 'borrower-detail' && <BorrowerDetailView />}
      </main>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}