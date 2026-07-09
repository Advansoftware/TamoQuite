'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiUrl } from '@/lib/config';
import { Zap, Eye, EyeOff, KeyRound, CheckCircle2, AlertTriangle, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const tooShort = password.length > 0 && password.length < 6;
  const mismatch = confirm.length > 0 && password !== confirm;
  const canSubmit = password.length >= 6 && password === confirm && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/auth/reset-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.message || data.error || 'Link inválido ou expirado. Solicite um novo.');
        return;
      }
      setDone(true);
      setTimeout(() => router.replace('/'), 2500);
    } catch (err) {
      console.error('Reset-password fetch error:', err);
      toast.error('Erro de conexão com o servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-background">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-neon flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(0,255,163,0.3)]">
            <Zap className="w-8 h-8 text-background" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">TamoQuite</h1>
            <p className="text-sm text-muted-foreground mt-1">Redefinir senha</p>
          </div>
        </div>

        {!token ? (
          <div className="space-y-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7 text-red-400" />
            </div>
            <p className="text-sm text-muted-foreground">
              Link inválido. Solicite uma nova recuperação de senha na tela de login.
            </p>
            <Link
              href="/"
              className="w-full inline-flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar ao login
            </Link>
          </div>
        ) : done ? (
          <div className="space-y-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-neon-dim flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7 text-neon" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-foreground">Senha redefinida!</h2>
              <p className="text-sm text-muted-foreground">
                Sua senha foi alterada com sucesso. Redirecionando para o login…
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Nova senha</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  disabled={loading}
                  autoFocus
                  className="w-full h-12 px-4 pr-12 bg-surface border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon/50 focus:ring-1 focus:ring-neon/20 transition-all text-sm disabled:opacity-50"
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
              {tooShort && <p className="text-xs text-red-400">A senha deve ter no mínimo 6 caracteres.</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Confirmar nova senha</label>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Repita a senha"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                disabled={loading}
                className="w-full h-12 px-4 bg-surface border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon/50 focus:ring-1 focus:ring-neon/20 transition-all text-sm disabled:opacity-50"
              />
              {mismatch && <p className="text-xs text-red-400">As senhas não coincidem.</p>}
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
                  <KeyRound className="w-4 h-4" />
                  Redefinir senha
                </>
              )}
            </button>

            <Link
              href="/"
              className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar ao login
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
