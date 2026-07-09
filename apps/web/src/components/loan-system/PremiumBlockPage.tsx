'use client';

import { useState } from 'react';
import { apiPost } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import { Zap, CreditCard, LogOut, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function PremiumBlockPage() {
  const { logout } = useAppStore();
  const [loading, setLoading] = useState(false);

  const handleStripeCheckout = async () => {
    setLoading(true);
    try {
      const res = await apiPost('/api/stripe/checkout', {});
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || data.message || 'Erro ao iniciar checkout');
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
