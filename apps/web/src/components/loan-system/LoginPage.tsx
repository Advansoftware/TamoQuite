'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAppStore } from '@/lib/store';
import { apiUrl } from '@/lib/config';
import { Zap, Eye, EyeOff, LogIn, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

type Mode = 'login' | 'forgot';

export function LoginPage({ onBackToLanding }: { onBackToLanding?: () => void }) {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const { setUser } = useAppStore();

  const canSubmit = email.trim().length > 0 && password.length > 0 && !loading;

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim().length === 0 || loading) return;

    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/auth/forgot-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) {
        toast.error('Não foi possível enviar o email. Tente novamente.');
        return;
      }
      setForgotSent(true);
    } catch (err) {
      console.error('Forgot-password fetch error:', err);
      toast.error('Erro de conexão com o servidor');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setForgotSent(false);
    setPassword('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/auth/login'), {
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

        {/* Login form */}
        {mode === 'login' && (
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
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">Senha</label>
                <button
                  type="button"
                  onClick={() => switchMode('forgot')}
                  className="text-xs text-neon/90 hover:text-neon transition-colors cursor-pointer"
                >
                  Esqueci minha senha
                </button>
              </div>
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
        )}

        {/* Forgot-password form */}
        {mode === 'forgot' && !forgotSent && (
          <form onSubmit={handleForgot} className="space-y-4">
            <div className="text-center space-y-1">
              <h2 className="text-lg font-semibold text-foreground">Recuperar senha</h2>
              <p className="text-sm text-muted-foreground">
                Informe seu email e enviaremos um link para redefinir sua senha.
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Email</label>
              <input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                disabled={loading}
                autoFocus
                className="w-full h-12 px-4 bg-surface border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon/50 focus:ring-1 focus:ring-neon/20 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            <button
              type="submit"
              disabled={email.trim().length === 0 || loading}
              className="w-full h-12 bg-neon text-background rounded-xl font-semibold text-sm hover:shadow-[0_0_20px_rgba(0,255,163,0.3)] transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:active:scale-100 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-background/30 border-t-background rounded-full animate-spin" />
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  Enviar link de recuperação
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar ao login
            </button>
          </form>
        )}

        {/* Forgot-password success */}
        {mode === 'forgot' && forgotSent && (
          <div className="space-y-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-neon-dim flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7 text-neon" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-foreground">Verifique seu email</h2>
              <p className="text-sm text-muted-foreground">
                Se houver uma conta associada a <span className="text-foreground">{email.trim()}</span>, você receberá um
                link para redefinir a senha. O link expira em 1 hora.
              </p>
            </div>
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar ao login
            </button>
          </div>
        )}

        <p className="text-xs text-center text-muted-foreground/50">
          Acesso restrito ·{' '}
          <Link href="/privacidade" className="hover:text-muted-foreground transition-colors underline underline-offset-2">
            Política de Privacidade
          </Link>
          {' · '}
          <Link href="/excluir-conta" className="hover:text-muted-foreground transition-colors underline underline-offset-2">
            Excluir conta
          </Link>
        </p>
      </div>
    </div>
  );
}