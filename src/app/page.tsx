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
import { SupportButton } from '@/components/loan-system/SupportButton';
import { useAppStore } from '@/lib/store';
import { Zap, CreditCard, LogOut, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

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
function PremiumBlockPage() {
  const { logout } = useAppStore();
  const [loading, setLoading] = useState(false);

  const handleStripeCheckout = async () => {
    setLoading(true);
    try {
      const state = useAppStore.getState();
      const token = state.token;
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'Erro ao iniciar checkout');
        setLoading(false);
        return;
      }

      const { url } = await res.json();
      window.location.href = url;
    } catch (err: unknown) {
      console.error(err);
      toast.error('Erro de conexão ao iniciar checkout');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 relative">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-neon/5 rounded-full blur-[80px] pointer-events-none -z-10" />

      <div className="w-full max-w-md bg-surface border border-border rounded-3xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.6)] text-center space-y-6 animate-in fade-in duration-300">
        <div className="w-16 h-16 rounded-2xl bg-neon flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(0,255,163,0.3)] animate-pulse">
          <Zap className="w-8 h-8 text-background" />
        </div>

        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Assinatura Requerida</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Sua conta foi criada com sucesso, mas você precisa de uma assinatura ativa para liberar o acesso ao sistema.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-secondary/40 border border-border text-left space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-foreground">Plano Completo</span>
            <span className="text-sm font-bold text-neon">R$ 14,90 / mês</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Tenha acesso ilimitado a todos os recursos: devedores ilimitados, cálculo automático de juros, e cobranças amigáveis por WhatsApp.
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleStripeCheckout}
            disabled={loading}
            className="w-full h-12 bg-neon text-background rounded-xl font-bold text-sm hover:shadow-[0_0_20px_rgba(0,255,163,0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <CreditCard className="w-4 h-4" />
                Ativar Assinatura via Stripe
              </>
            )}
          </button>

          <button
            onClick={logout}
            className="w-full h-12 bg-transparent text-muted-foreground hover:text-foreground font-semibold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Sair da Conta
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { currentView, user, isLoading, isAuthenticated, setUser } = useAppStore();
  const [error, setError] = useState<Error | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const initialCheckDone = useRef(false);

  useEffect(() => {
    // Check if redirecting back from Stripe checkout success
    const params = new URLSearchParams(window.location.search);
    if (params.get('session_id')) {
      (async () => {
        try {
          const res = await apiFetch('/api/auth/me');
          if (res.ok) {
            const data = await res.json();
            setUser(data);
            toast.success('Assinatura ativada com sucesso! Bem-vindo.');
            const cleanUrl = window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
          }
        } catch (err) {
          console.error(err);
        }
      })();
    }
  }, []);

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
      return (
        <>
          <LoginPage onBackToLanding={() => setShowLogin(false)} />
          <SupportButton />
        </>
      );
    }
    return (
      <>
        <LandingPage onEnterApp={() => setShowLogin(true)} />
        <SupportButton />
      </>
    );
  }

  // Check subscription status for regular CLIENT users
  if (user.role === 'CLIENT' && user.subscriptionStatus !== 'active') {
    return (
      <>
        <PremiumBlockPage />
        <SupportButton />
      </>
    );
  }

  // Force password change on first login
  if (user.mustChangePassword) {
    return (
      <>
        <ChangePasswordPage />
        <SupportButton />
      </>
    );
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
        <div className="max-w-5xl mx-auto flex items-center justify-between h-14 px-4 w-full">
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

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6 ml-8">
              <button
                onClick={() => useAppStore.getState().setView('dashboard')}
                className={`text-sm font-medium transition-colors cursor-pointer ${
                  currentView === 'dashboard' ? 'text-neon font-semibold' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Painel
              </button>
              <button
                onClick={() => useAppStore.getState().setView('borrowers')}
                className={`text-sm font-medium transition-colors cursor-pointer ${
                  currentView === 'borrowers' ? 'text-neon font-semibold' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Pessoas
              </button>
              <button
                onClick={() => useAppStore.getState().setView('loans')}
                className={`text-sm font-medium transition-colors cursor-pointer ${
                  currentView === 'loans' ? 'text-neon font-semibold' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Empréstimos
              </button>
              {user?.role === 'ADMIN' && (
                <button
                  onClick={() => useAppStore.getState().setView('admin')}
                  className={`text-sm font-medium transition-colors cursor-pointer ${
                    currentView === 'admin' || currentView === 'admin-user-dashboard' ? 'text-neon font-semibold' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Admin
                </button>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground truncate max-w-[140px] hidden sm:inline">
              {user.name}
            </span>
            {/* Profile Button for Desktop */}
            <button
              onClick={() => window.dispatchEvent(new Event('open-settings-dialog'))}
              className="hidden md:flex w-8 h-8 rounded-full bg-neon-dim border border-neon/20 items-center justify-center text-neon text-xs font-bold hover:bg-neon/20 transition-all cursor-pointer"
            >
              {user.name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() || 'U'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 pt-4 pb-24 md:px-6">
        {currentView === 'dashboard' && <DashboardView />}
        {currentView === 'borrowers' && <BorrowersView />}
        {currentView === 'loans' && <LoansView />}
        {currentView === 'loan-detail' && <LoanDetailView />}
        {currentView === 'borrower-detail' && <BorrowerDetailView />}
        {currentView === 'admin' && <AdminView />}
        {currentView === 'admin-user-dashboard' && <AdminUserDashboardView />}
      </main>

      <BottomNav />
      <SupportButton />
    </div>
  );
}