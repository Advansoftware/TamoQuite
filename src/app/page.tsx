'use client';

import { useEffect, useState, useRef } from 'react';
import { apiFetch } from '@/lib/api';
import { BottomNav } from '@/components/loan-system/Navigation';
import { DashboardView } from '@/components/loan-system/DashboardView';
import { BorrowersView } from '@/components/loan-system/BorrowersView';
import { LoansView } from '@/components/loan-system/LoansView';
import { LoanDetailView } from '@/components/loan-system/LoanDetailView';
import { BorrowerDetailView } from '@/components/loan-system/BorrowerDetailView';
import { AdminView, AdminUserDashboardView } from '@/components/loan-system/AdminView';
import { LoginPage } from '@/components/loan-system/LoginPage';
import { LandingPage } from '@/components/loan-system/LandingPage';
import { ChangePasswordPage } from '@/components/loan-system/ChangePasswordPage';
import { ServiceWorkerRegister } from '@/components/loan-system/ServiceWorkerRegister';
import { useAppStore } from '@/lib/store';
import { Zap } from 'lucide-react';

function ErrorFallback({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6">
      <div className="w-16 h-16 rounded-2xl bg-danger/10 flex items-center justify-center mb-4">
        <span className="text-3xl">⚠️</span>
      </div>
      <h2 className="text-lg font-bold text-foreground mb-2">Algo deu errado</h2>
      <p className="text-sm text-muted-foreground text-center mb-6 max-w-xs">{error.message}</p>
      <button
        onClick={reset}
        className="px-6 py-3 bg-neon text-background rounded-xl font-semibold text-sm"
      >
        Tentar novamente
      </button>
    </div>
  );
}

export default function Home() {
  const { currentView, user, isLoading, isAuthenticated, setUser } = useAppStore();
  const [error, setError] = useState<Error | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const initialCheckDone = useRef(false);

  useEffect(() => {
    // Only run the session check once on mount
    if (initialCheckDone.current) return;
    initialCheckDone.current = true;

    (async () => {
      try {
        const res = await apiFetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUser(data);
        } else {
          // Session not found or expired — only clear if not already authenticated
          // (e.g. after a fresh login, don't overwrite the user)
          const currentState = useAppStore.getState();
          if (!currentState.isAuthenticated) {
            setUser(null);
          }
        }
      } catch {
        const currentState = useAppStore.getState();
        if (!currentState.isAuthenticated) {
          setUser(null);
        }
      }
    })();
  }, []);

  // Show loading spinner
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <div className="w-12 h-12 rounded-2xl bg-neon flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(0,255,163,0.3)] animate-pulse">
          <Zap className="w-6 h-6 text-background" />
        </div>
        <div className="w-6 h-6 border-2 border-neon/30 border-t-neon rounded-full animate-spin" />
      </div>
    );
  }

  // Show landing page or login page
  if (!isAuthenticated || !user) {
    if (showLogin) {
      return <LoginPage onBackToLanding={() => setShowLogin(false)} />;
    }
    return <LandingPage onEnterApp={() => setShowLogin(true)} />;
  }

  // Force password change on first login
  if (user.mustChangePassword) {
    return <ChangePasswordPage />;
  }

  if (error) {
    return <ErrorFallback error={error} reset={() => setError(null)} />;
  }

  const showBack = currentView === 'loan-detail' || currentView === 'borrower-detail' || currentView === 'admin-user-dashboard';

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <ServiceWorkerRegister />

      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-lg mx-auto flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-2.5">
            {showBack && (
              <button
                onClick={() => useAppStore.getState().goBack()}
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
              <span className="text-base font-bold text-foreground tracking-tight">TamoQuite</span>
            </div>
          </div>
          <span className="text-xs text-muted-foreground truncate max-w-[140px]">
            {user.name}
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 pt-4 pb-24">
        {currentView === 'dashboard' && <DashboardView />}
        {currentView === 'borrowers' && <BorrowersView />}
        {currentView === 'loans' && <LoansView />}
        {currentView === 'loan-detail' && <LoanDetailView />}
        {currentView === 'borrower-detail' && <BorrowerDetailView />}
        {currentView === 'admin' && <AdminView />}
        {currentView === 'admin-user-dashboard' && <AdminUserDashboardView />}
      </main>

      <BottomNav />
    </div>
  );
}