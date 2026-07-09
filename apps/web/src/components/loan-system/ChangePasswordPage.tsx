'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { apiPost } from '@/lib/api';
import { Zap, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

export function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user, setUser } = useAppStore();

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Preencha todos os campos');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('A nova senha deve ter no mínimo 6 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    setLoading(true);
    try {
      const res = await apiPost('/api/auth/change-password', { currentPassword, newPassword });

      if (!res.ok) {
        if (res.status === 401) {
          const data = await res.json().catch(() => null);
          if (data?.error === 'Senha atual incorreta') {
            toast.error('Senha atual incorreta');
          } else {
            toast.error('Sessão expirada. Faça login novamente.');
            // Log out the user so they can re-authenticate
            setTimeout(() => useAppStore.getState().logout(), 1000);
          }
        } else if (res.status === 400) {
          const data = await res.json().catch(() => null);
          toast.error(data?.error || 'Dados inválidos');
        } else {
          toast.error('Erro ao alterar senha. Tente novamente.');
        }
        return;
      }

      toast.success('Senha alterada com sucesso!');
      setUser({ ...user!, mustChangePassword: false });
    } catch (err) {
      console.error('Change password error:', err);
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
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-background">
      <div className="w-full max-w-sm space-y-8">
        {/* Icon */}
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-warning/10 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-8 h-8 text-warning" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Alterar Senha</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Bem-vindo, <strong className="text-foreground">{user?.name}</strong>! Por segurança, defina sua nova senha antes de continuar.
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Senha Atual</label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full h-12 px-4 pr-12 bg-surface border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon/50 focus:ring-1 focus:ring-neon/20 transition-all text-sm"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Nova Senha</label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                placeholder="Mínimo 6 caracteres"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full h-12 px-4 pr-12 bg-surface border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon/50 focus:ring-1 focus:ring-neon/20 transition-all text-sm"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Confirmar Nova Senha</label>
            <input
              type="password"
              placeholder="Repita a nova senha"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full h-12 px-4 bg-surface border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-neon/50 focus:ring-1 focus:ring-neon/20 transition-all text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-neon text-background rounded-xl font-semibold text-sm hover:shadow-[0_0_20px_rgba(0,255,163,0.3)] transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-background/30 border-t-background rounded-full animate-spin" />
            ) : (
              'Definir Senha e Entrar'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}