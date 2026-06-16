'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Zap, Eye, EyeOff, LogIn } from 'lucide-react';
import { toast } from 'sonner';

export function LoginPage({ onBackToLanding }: { onBackToLanding?: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { setUser } = useAppStore();

  const canSubmit = email.trim().length > 0 && password.length > 0 && !loading;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (!res.ok) {
        if (res.status === 401) {
          toast.error('Email ou senha inválidos');
        } else if (res.status === 400) {
          const data = await res.json();
          toast.error(data.error || 'Preencha todos os campos');
        } else {
          toast.error('Erro no servidor. Tente novamente.');
        }
        return;
      }

      const data = await res.json();
      setUser(data.user, data.token);
    } catch (err) {
      console.error('Login fetch error:', err);
      if (err instanceof TypeError && err.message === 'Failed to fetch') {
        toast.error('Erro de conexão com o servidor. Verifique sua internet.');
      } else {
        toast.error('Erro de conexão com o servidor');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-background relative">
      {onBackToLanding && (
        <button
          onClick={onBackToLanding}
          className="absolute top-6 left-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Voltar ao início
        </button>
      )}
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-neon flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(0,255,163,0.3)]">
            <Zap className="w-8 h-8 text-background" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">TamoQuite</h1>
            <p className="text-sm text-muted-foreground mt-1">Cobranças & Repasses Inteligentes</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Email</label>
            <input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              disabled={loading}
              className="w-full h-12 px-4 bg-surface border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon/50 focus:ring-1 focus:ring-neon/20 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Senha</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                disabled={loading}
                className="w-full h-12 px-4 pr-12 bg-surface border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon/50 focus:ring-1 focus:ring-neon/20 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors disabled:pointer-events-none disabled:opacity-50"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full h-12 bg-neon text-background rounded-xl font-semibold text-sm hover:shadow-[0_0_20px_rgba(0,255,163,0.3)] transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:active:scale-100 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-background/30 border-t-background rounded-full animate-spin" />
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                Entrar
              </>
            )}
          </button>
        </form>

        <p className="text-xs text-center text-muted-foreground/50">
          Acesso restrito · Dados protegidos
        </p>
      </div>
    </div>
  );
}