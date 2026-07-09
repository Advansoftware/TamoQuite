'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { apiFetch, apiPost, apiDelete, getApiError } from '@/lib/api';
import { formatDate } from '@/lib/helpers';
import {
  Plus, UserPlus, Shield, Trash2, ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ManagedUser {
  id: string;
  email: string;
  name: string;
  role: string;
  mustChangePassword: boolean;
  createdAt: string;
  _count: { borrowers: number; loans: number };
}

export function AdminView() {
  const router = useRouter();
  const { user } = useAppStore();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ email: '', name: '', password: '', role: 'CLIENT' });
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await apiFetch('/api/admin/users');
      if (res.ok) setUsers(await res.json());
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  const handleCreate = async () => {
    if (!form.email || !form.name || !form.password) return;
    setSubmitting(true);
    try {
      const res = await apiPost('/api/auth/register', form);
      const errMsg = await getApiError(res);
      if (errMsg) { toast.error(errMsg); return; }
      setCreateOpen(false);
      setForm({ email: '', name: '', password: '', role: 'CLIENT' });
      toast.success('Usuário criado com sucesso!');
      fetchUsers();
    } catch {
      toast.error('Erro de conexão com o servidor');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (targetId: string) => {
    if (!confirm('Desativar este usuário?')) return;
    try {
      const res = await apiDelete('/api/admin/users', { targetUserId: targetId });
      const errMsg = await getApiError(res);
      if (errMsg) { toast.error(errMsg); return; }
      toast.success('Usuário desativado');
      fetchUsers();
    } catch {
      toast.error('Erro de conexão com o servidor');
    }
  };

  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Shield className="w-5 h-5 text-neon" />
            Administração
          </h2>
          <p className="text-sm text-muted-foreground">{users.length} usuário{users.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-neon text-background rounded-xl text-sm font-semibold hover:shadow-[0_0_20px_rgba(0,255,163,0.3)] transition-all active:scale-95"
        >
          <UserPlus className="w-4 h-4" />
          <span className="hidden sm:inline">Novo</span>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-neon/30 border-t-neon rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {users.map((u) => (
            <div key={u.id} className="bg-surface rounded-xl p-4 border border-border card-hover">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                  u.role === 'ADMIN' ? 'bg-neon-dim' : 'bg-surface-elevated'
                }`}>
                  <span className={`text-xs font-bold ${
                    u.role === 'ADMIN' ? 'text-neon' : 'text-muted-foreground'
                  }`}>
                    {u.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground truncate">{u.name}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${
                      u.role === 'ADMIN' ? 'bg-neon-dim text-neon' : 'bg-surface-elevated text-muted-foreground'
                    }`}>
                      {u.role}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                  <p className="text-xs text-muted-foreground/60">
                    {u._count.loans} empréstimos · {u._count.borrowers} devedores
                  </p>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  {u.email !== 'brunoantunes94@hotmail.com' && (
                    <>
                      <button
                        onClick={() => router.push(`/admin/users/${u.id}`)}
                        className="w-8 h-8 rounded-lg bg-secondary hover:bg-neon/10 flex items-center justify-center transition-colors"
                        title="Ver dashboard"
                      >
                        <ChevronRight className="w-4 h-4 text-neon" />
                      </button>
                      <button
                        onClick={() => handleDeactivate(u.id)}
                        className="w-8 h-8 rounded-lg bg-secondary hover:bg-danger/10 flex items-center justify-center transition-colors"
                        title="Desativar"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create User Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-surface border-border text-foreground sm:max-w-md sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Novo Usuário</DialogTitle>
            <DialogDescription className="text-muted-foreground">Crie um novo usuário para o sistema</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome completo *</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome do usuário" className="bg-surface-elevated border-border text-foreground placeholder:text-muted-foreground rounded-xl h-11" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email *</label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@exemplo.com" className="bg-surface-elevated border-border text-foreground placeholder:text-muted-foreground rounded-xl h-11" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Senha Provisória *</label>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Mínimo 6 caracteres" className="bg-surface-elevated border-border text-foreground placeholder:text-muted-foreground rounded-xl h-11" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo</label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger className="bg-surface-elevated border-border text-foreground rounded-xl h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-surface-elevated border-border">
                  <SelectItem value="CLIENT" className="text-foreground">Cliente</SelectItem>
                  {user?.email === 'brunoantunes94@hotmail.com' && (
                    <SelectItem value="ADMIN" className="text-foreground">Administrador</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="secondary" onClick={() => setCreateOpen(false)} className="bg-surface-elevated text-foreground hover:bg-secondary rounded-xl flex-1">Cancelar</Button>
            <Button onClick={handleCreate} disabled={submitting || !form.email || !form.name || !form.password} className="bg-neon text-background hover:bg-neon/90 font-semibold rounded-xl flex-1">
              {submitting ? 'Criando...' : 'Criar Usuário'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function AdminUserDashboardView() {
  const params = useParams();
  const adminSelectedUserId = params.id as string;
  const [userInfo, setUserInfo] = useState<ManagedUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!adminSelectedUserId) return;
    let cancelled = false;
    (async () => {
      try {
        const usersRes = await apiFetch('/api/admin/users');
        if (usersRes.ok && !cancelled) {
          const users = await usersRes.json();
          setUserInfo(users.find((u: ManagedUser) => u.id === adminSelectedUserId) || null);
        }
      } catch {}
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [adminSelectedUserId]);

  if (loading) {
    return <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-neon/30 border-t-neon rounded-full animate-spin" /></div>;
  }

  if (!userInfo) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-muted-foreground">Usuário não encontrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-neon-dim flex items-center justify-center">
          <span className="text-neon font-bold">
            {userInfo.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
          </span>
        </div>
        <div>
          <p className="text-base font-bold text-foreground">{userInfo.name}</p>
          <p className="text-xs text-muted-foreground">{userInfo.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-surface rounded-2xl p-4 border border-border">
          <p className="text-xs text-muted-foreground mb-1">Empréstimos</p>
          <p className="text-lg font-bold text-foreground">{userInfo._count.loans}</p>
        </div>
        <div className="bg-surface rounded-2xl p-4 border border-border">
          <p className="text-xs text-muted-foreground mb-1">Devedores</p>
          <p className="text-lg font-bold text-foreground">{userInfo._count.borrowers}</p>
        </div>
      </div>

      <div className="bg-surface rounded-2xl p-4 border border-border">
        <p className="text-sm font-medium text-foreground mb-2">Informações do Usuário</p>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tipo</span>
            <span className={userInfo.role === 'ADMIN' ? 'text-neon' : 'text-foreground'}>{userInfo.role}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Criado em</span>
            <span className="text-foreground">{formatDate(userInfo.createdAt)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Senha alterada</span>
            <span className={userInfo.mustChangePassword ? 'text-warning' : 'text-neon'}>
              {userInfo.mustChangePassword ? 'Pendente' : 'Sim'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}