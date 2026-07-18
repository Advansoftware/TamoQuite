'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { formatDate } from '@/lib/helpers';
import {
  Plus, UserPlus, Shield, Trash2, ChevronRight, Ticket, Gift, RotateCcw, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  useAdminUsers, useCreateUser, useDeactivateUser, useResetTrial,
  useCoupons, useCreateCoupon, useApplyCoupon,
} from '@/features/admin/use-admin';
import type { Coupon, ManagedUser } from '@/features/admin/types';
import { Spinner } from '@/components/ui/spinner';

const SUPER_ADMIN_EMAIL = 'brunoantunes94@hotmail.com';

// Maps Stripe subscription statuses to a short PT label + tone for the admin badges.
const SUB_STATUS: Record<string, { label: string; tone: string }> = {
  active: { label: 'Ativo', tone: 'bg-neon-dim text-neon' },
  trialing: { label: 'Em teste', tone: 'bg-warning/10 text-warning' },
  past_due: { label: 'Atrasado', tone: 'bg-danger/10 text-danger' },
  canceled: { label: 'Cancelado', tone: 'bg-surface-elevated text-muted-foreground' },
  unpaid: { label: 'Não pago', tone: 'bg-danger/10 text-danger' },
  INACTIVE: { label: 'Sem assinatura', tone: 'bg-surface-elevated text-muted-foreground' },
};

function subBadge(status: string | null) {
  return SUB_STATUS[status || 'INACTIVE'] ?? { label: status || 'Sem assinatura', tone: 'bg-surface-elevated text-muted-foreground' };
}

function couponLabel(c: Coupon): string {
  const off = c.percentOff ? `${c.percentOff}% off` : c.amountOff ? `R$ ${(c.amountOff / 100).toFixed(2)} off` : 'desconto';
  const dur = c.duration === 'repeating' ? ` por ${c.durationInMonths} mês(es)` : c.duration === 'forever' ? ' (recorrente)' : ' (1x)';
  return `${off}${dur}`;
}

export function AdminView() {
  const router = useRouter();
  const { user } = useAppStore();
  const { data: users = [], isLoading: loading } = useAdminUsers();
  const createUser = useCreateUser();
  const deactivateUser = useDeactivateUser();
  const resetTrial = useResetTrial();
  const submitting = createUser.isPending;

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ email: '', name: '', password: '', role: 'CLIENT' });

  const handleCreate = async () => {
    if (!form.email || !form.name || !form.password) return;
    try {
      await createUser.mutateAsync(form);
      setCreateOpen(false);
      setForm({ email: '', name: '', password: '', role: 'CLIENT' });
      toast.success('Usuário criado com sucesso!');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro de conexão com o servidor');
    }
  };

  const handleDeactivate = async (targetId: string) => {
    if (!confirm('Desativar este usuário?')) return;
    try {
      await deactivateUser.mutateAsync(targetId);
      toast.success('Usuário desativado');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro de conexão com o servidor');
    }
  };

  // ---- Assinatura / trial / cupons (somente super admin) ----
  const isSuperAdmin = user?.email === SUPER_ADMIN_EMAIL;
  const { data: coupons = [] } = useCoupons(isSuperAdmin);
  const createCoupon = useCreateCoupon();
  const applyCouponMut = useApplyCoupon();
  const creatingCoupon = createCoupon.isPending;
  const applying = applyCouponMut.isPending;
  const [couponForm, setCouponForm] = useState({ name: '', percentOff: '', months: '', code: '', maxRedemptions: '' });
  const [applyFor, setApplyFor] = useState<ManagedUser | null>(null);
  const [selectedCouponId, setSelectedCouponId] = useState('');

  const handleResetTrial = async (u: ManagedUser) => {
    if (!confirm(`Liberar um novo teste grátis de 7 dias para ${u.name}?`)) return;
    try {
      await resetTrial.mutateAsync(u.id);
      toast.success('Teste grátis liberado novamente.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro de conexão com o servidor');
    }
  };

  const handleCreateCoupon = async () => {
    const percentOff = couponForm.percentOff ? Number(couponForm.percentOff) : undefined;
    const months = couponForm.months ? Number(couponForm.months) : undefined;
    const maxRedemptions = couponForm.maxRedemptions ? Number(couponForm.maxRedemptions) : undefined;
    if (!percentOff) { toast.error('Informe o percentual de desconto (1 a 100).'); return; }
    try {
      await createCoupon.mutateAsync({
        name: couponForm.name || undefined,
        percentOff,
        months,
        code: couponForm.code || undefined,
        maxRedemptions,
      });
      toast.success('Cupom criado!');
      setCouponForm({ name: '', percentOff: '', months: '', code: '', maxRedemptions: '' });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro de conexão com o servidor');
    }
  };

  const handleApplyCoupon = async () => {
    if (!applyFor || !selectedCouponId) return;
    try {
      await applyCouponMut.mutateAsync({ userId: applyFor.id, couponId: selectedCouponId });
      toast.success(`Cupom aplicado para ${applyFor.name}.`);
      setApplyFor(null);
      setSelectedCouponId('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro de conexão com o servidor');
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
          className="flex items-center gap-2 px-4 h-11 sm:h-auto sm:py-2.5 bg-neon text-background rounded-xl text-sm font-semibold hover:shadow-[0_0_20px_rgba(0,255,163,0.3)] transition-all active:scale-95"
        >
          <UserPlus className="w-4 h-4" />
          <span className="hidden sm:inline">Novo</span>
        </button>
      </div>

      {isSuperAdmin && (
        <div className="bg-surface rounded-2xl p-4 border border-border space-y-4">
          <div className="flex items-center gap-2">
            <Ticket className="w-4 h-4 text-neon" />
            <h3 className="text-sm font-bold text-foreground">Cupons de desconto</h3>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Crie um cupom (ex.: <strong className="text-foreground">100% por 12 meses = 1 ano grátis</strong>). Preencha um <strong className="text-foreground">código</strong> para enviar ao cliente digitar no checkout, ou deixe em branco e <strong className="text-foreground">aplique direto</strong> num usuário na lista abaixo.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <Input value={couponForm.name} onChange={(e) => setCouponForm({ ...couponForm, name: e.target.value })} placeholder="Nome (opcional)" className="bg-surface-elevated border-border text-foreground placeholder:text-muted-foreground rounded-xl h-10 text-sm" />
            <Input value={couponForm.percentOff} onChange={(e) => setCouponForm({ ...couponForm, percentOff: e.target.value })} type="number" placeholder="% desconto (1-100)" className="bg-surface-elevated border-border text-foreground placeholder:text-muted-foreground rounded-xl h-10 text-sm" />
            <Input value={couponForm.months} onChange={(e) => setCouponForm({ ...couponForm, months: e.target.value })} type="number" placeholder="Meses (vazio = 1x)" className="bg-surface-elevated border-border text-foreground placeholder:text-muted-foreground rounded-xl h-10 text-sm" />
            <Input value={couponForm.code} onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value })} placeholder="Código p/ enviar (opcional)" className="bg-surface-elevated border-border text-foreground placeholder:text-muted-foreground rounded-xl h-10 text-sm" />
            <Input value={couponForm.maxRedemptions} onChange={(e) => setCouponForm({ ...couponForm, maxRedemptions: e.target.value })} type="number" placeholder="Usos máx. (opcional)" className="bg-surface-elevated border-border text-foreground placeholder:text-muted-foreground rounded-xl h-10 text-sm" />
            <Button onClick={handleCreateCoupon} disabled={creatingCoupon} className="bg-neon text-background hover:bg-neon/90 font-semibold rounded-xl h-10 text-sm">
              {creatingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Criar cupom</>}
            </Button>
          </div>

          <div className="space-y-2">
            {coupons.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum cupom criado ainda.</p>
            ) : (
              coupons.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-2 p-2.5 bg-surface-elevated rounded-lg text-xs">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate">{c.name || c.id}</p>
                    <p className="text-muted-foreground">{couponLabel(c)}</p>
                    {c.codes.length > 0 && (
                      <p className="text-neon font-mono mt-0.5">
                        {c.codes.map((cc) => `${cc.code}${cc.maxRedemptions ? ` (${cc.timesRedeemed}/${cc.maxRedemptions})` : ''}`).join(', ')}
                      </p>
                    )}
                  </div>
                  {!c.valid && <span className="text-danger shrink-0">expirado</span>}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner />
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
                  {u.role === 'CLIENT' && (
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${subBadge(u.subscriptionStatus).tone}`}>
                        {subBadge(u.subscriptionStatus).label}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${u.trialUsedAt ? 'bg-surface-elevated text-muted-foreground' : 'bg-neon-dim text-neon'}`}>
                        {u.trialUsedAt ? 'Trial usado' : 'Trial disponível'}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  {u.email !== SUPER_ADMIN_EMAIL && (
                    <>
                      <button
                        onClick={() => router.push(`/admin/users/${u.id}`)}
                        className="w-11 h-11 sm:w-8 sm:h-8 rounded-lg bg-secondary hover:bg-neon/10 flex items-center justify-center transition-colors"
                        title="Ver dashboard"
                      >
                        <ChevronRight className="w-4 h-4 text-neon" />
                      </button>
                      {isSuperAdmin && (
                        <button
                          onClick={() => { setApplyFor(u); setSelectedCouponId(''); }}
                          className="w-11 h-11 sm:w-8 sm:h-8 rounded-lg bg-secondary hover:bg-neon/10 flex items-center justify-center transition-colors"
                          title="Aplicar cupom"
                        >
                          <Gift className="w-3.5 h-3.5 text-neon" />
                        </button>
                      )}
                      {isSuperAdmin && u.trialUsedAt && (
                        <button
                          onClick={() => handleResetTrial(u)}
                          className="w-11 h-11 sm:w-8 sm:h-8 rounded-lg bg-secondary hover:bg-warning/10 flex items-center justify-center transition-colors"
                          title="Liberar novo teste grátis"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-warning" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeactivate(u.id)}
                        className="w-11 h-11 sm:w-8 sm:h-8 rounded-lg bg-secondary hover:bg-danger/10 flex items-center justify-center transition-colors"
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

      {/* Apply Coupon Dialog */}
      <Dialog open={!!applyFor} onOpenChange={(open) => { if (!open) { setApplyFor(null); setSelectedCouponId(''); } }}>
        <DialogContent className="bg-surface border-border text-foreground sm:max-w-md sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Gift className="w-5 h-5 text-neon" />
              Aplicar cupom
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Aplica um desconto direto na conta de <strong className="text-foreground">{applyFor?.name}</strong>. Ele não precisa digitar código nenhum.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Select value={selectedCouponId} onValueChange={setSelectedCouponId}>
              <SelectTrigger className="bg-surface-elevated border-border text-foreground rounded-xl h-11">
                <SelectValue placeholder="Escolha um cupom" />
              </SelectTrigger>
              <SelectContent className="bg-surface-elevated border-border">
                {coupons.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-foreground">
                    {(c.name || c.id)} — {couponLabel(c)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Se o usuário já tem assinatura, o desconto entra na assinatura atual. Se ainda não assinou, fica guardado na conta e aplica na próxima assinatura.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="secondary" onClick={() => { setApplyFor(null); setSelectedCouponId(''); }} className="bg-surface-elevated text-foreground hover:bg-secondary rounded-xl flex-1">Cancelar</Button>
            <Button onClick={handleApplyCoupon} disabled={applying || !selectedCouponId} className="bg-neon text-background hover:bg-neon/90 font-semibold rounded-xl flex-1">
              {applying ? 'Aplicando...' : 'Aplicar cupom'}
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
  const { data: users, isLoading: loading } = useAdminUsers();
  const userInfo = users?.find((u) => u.id === adminSelectedUserId) ?? null;

  if (loading) {
    return <div className="flex justify-center py-12"><Spinner /></div>;
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