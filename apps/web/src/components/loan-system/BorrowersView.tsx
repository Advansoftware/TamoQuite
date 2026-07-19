'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatPhone } from '@/lib/helpers';
import { Plus, Search, Phone, UserX, UserCheck, User, ChevronRight, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PhoneInput } from '@/components/ui/phone-input';
import { Button } from '@/components/ui/button';
import { useBorrowers, useCreateBorrower, useUpdateBorrower, useDeactivateBorrower, useReactivateBorrower } from '@/features/borrowers/use-borrowers';
import { FilterTabs } from '@/components/ui/filter-tabs';
import type { Borrower } from '@/features/borrowers/types';
import { Spinner } from '@/components/ui/spinner';
import { EmptyState } from '@/components/ui/empty-state';

export function BorrowersView() {
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [tab, setTab] = useState<'active' | 'inactive'>('active');
  const [selected, setSelected] = useState<Borrower | null>(null);
  const [form, setForm] = useState({ name: '', whatsapp: '', notes: '' });
  const router = useRouter();

  const { data: borrowers = [], isLoading: loading } = useBorrowers(tab);
  const { data: inactiveList = [] } = useBorrowers('inactive');
  const createMut = useCreateBorrower();
  const updateMut = useUpdateBorrower();
  const deactivateMut = useDeactivateBorrower();
  const reactivateMut = useReactivateBorrower();
  const submitting = createMut.isPending || updateMut.isPending || deactivateMut.isPending || reactivateMut.isPending;

  const filtered = borrowers.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.whatsapp.includes(search)
  );

  const openCreate = () => {
    setForm({ name: '', whatsapp: '', notes: '' });
    setCreateOpen(true);
  };

  const openEdit = (b: Borrower) => {
    setSelected(b);
    setForm({ name: b.name, whatsapp: b.whatsapp, notes: b.notes || '' });
    setEditOpen(true);
  };

  const openDeactivate = (b: Borrower) => {
    setSelected(b);
    setDeactivateOpen(true);
  };

  const handleCreate = async () => {
    if (!form.name || !form.whatsapp) return;
    try {
      await createMut.mutateAsync(form);
      setCreateOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro de conexão com o servidor');
    }
  };

  const handleEdit = async () => {
    if (!selected || !form.name || !form.whatsapp) return;
    try {
      await updateMut.mutateAsync({ id: selected.id, input: form });
      setEditOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro de conexão com o servidor');
    }
  };

  const handleDeactivate = async () => {
    if (!selected) return;
    try {
      await deactivateMut.mutateAsync(selected.id);
      toast.success('Cliente desativado. Os contratos e parcelas dele saíram de tudo.');
      setDeactivateOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro de conexão com o servidor');
    }
  };

  const handleReactivate = async (b: Borrower) => {
    try {
      await reactivateMut.mutateAsync(b.id);
      toast.success('Cliente reativado.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro de conexão com o servidor');
    }
  };

  return (
    <div className="space-y-4 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Clientes</h2>
          <p className="text-sm text-muted-foreground">{borrowers.length} cadastrado{borrowers.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 h-11 sm:h-auto sm:py-2.5 bg-neon text-background rounded-xl text-sm font-semibold hover:shadow-[0_0_20px_rgba(0,255,163,0.3)] transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Novo</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou WhatsApp..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-surface border-border text-foreground placeholder:text-muted-foreground rounded-xl h-11"
        />
      </div>

      <FilterTabs
        value={tab}
        onChange={setTab}
        options={[
          { value: 'active', label: 'Ativos' },
          { value: 'inactive', label: 'Desativados', count: inactiveList.length },
        ]}
      />

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={User} title={search ? 'Nenhum resultado encontrado' : 'Nenhum cliente cadastrado ainda'} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((b) => {
            const hasOverdue = b.loans?.some(l => l.installments?.some(i => i.status === 'OVERDUE')) || false;
            return (
              <div
                key={b.id}
                className={`bg-surface rounded-xl p-4 border card-hover ${
                  hasOverdue ? 'border-danger/30 bg-danger/5' : 'border-border'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                    hasOverdue ? 'bg-danger/20' : 'bg-neon-dim'
                  }`}>
                    <span className={`font-bold text-sm ${hasOverdue ? 'text-danger' : 'text-neon'}`}>
                      {b.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => router.push(`/borrowers/${b.id}`)}>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-sm font-semibold text-foreground truncate">{b.name}</p>
                      {hasOverdue && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-danger/10 text-danger border border-danger/20 font-bold flex items-center gap-0.5 shrink-0 animate-pulse">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          Atrasado
                        </span>
                      )}
                      {b._count.loans > 0 && !hasOverdue && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-neon-dim text-neon font-medium">
                          {b._count.loans}
                        </span>
                      )}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Phone className="w-3 h-3 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">{formatPhone(b.whatsapp)}</p>
                  </div>
                  {b.notes && (
                    <p className="text-xs text-muted-foreground/60 truncate mt-0.5">{b.notes}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openEdit(b)}
                    className="w-11 h-11 sm:w-8 sm:h-8 rounded-lg bg-secondary hover:bg-surface-elevated flex items-center justify-center transition-colors"
                  >
                    <svg className="w-3.5 h-3.5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  {tab === 'inactive' ? (
                    <button
                      title="Reativar cliente"
                      onClick={() => handleReactivate(b)}
                      className="w-11 h-11 sm:w-8 sm:h-8 rounded-lg bg-secondary hover:bg-neon-dim flex items-center justify-center transition-colors"
                    >
                      <UserCheck className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  ) : (
                    <button
                      title="Desativar cliente"
                      onClick={() => openDeactivate(b)}
                      className="w-11 h-11 sm:w-8 sm:h-8 rounded-lg bg-secondary hover:bg-danger/10 flex items-center justify-center transition-colors"
                    >
                      <UserX className="w-3.5 h-3.5 text-muted-foreground hover:text-danger" />
                    </button>
                  )}
                  <button
                    onClick={() => router.push(`/borrowers/${b.id}`)}
                    className="w-11 h-11 sm:w-8 sm:h-8 rounded-lg bg-secondary hover:bg-surface-elevated flex items-center justify-center transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-surface border-border text-foreground sm:max-w-md sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Novo Cliente</DialogTitle>
            <DialogDescription className="text-muted-foreground">Cadastre um devedor para controlar empréstimos</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Nome completo *</label>
              <Input
                placeholder="Ex: João Silva"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="bg-surface-elevated border-border text-foreground placeholder:text-muted-foreground rounded-xl h-11"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">WhatsApp *</label>
              <PhoneInput
                value={form.whatsapp}
                onChange={(whatsapp) => setForm({ ...form, whatsapp })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Observação</label>
              <Textarea
                placeholder="Contexto do empréstimo, relação, etc."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="bg-surface-elevated border-border text-foreground placeholder:text-muted-foreground rounded-xl min-h-[80px] resize-none"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="secondary"
              onClick={() => setCreateOpen(false)}
              className="bg-surface-elevated text-foreground hover:bg-secondary rounded-xl flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              disabled={submitting || !form.name || !form.whatsapp}
              className="bg-neon text-background hover:bg-neon/90 font-semibold rounded-xl flex-1"
            >
              {submitting ? 'Salvando...' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-surface border-border text-foreground sm:max-w-md sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Editar Cliente</DialogTitle>
            <DialogDescription className="text-muted-foreground">Atualize os dados do devedor</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Nome completo *</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="bg-surface-elevated border-border text-foreground placeholder:text-muted-foreground rounded-xl h-11"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">WhatsApp *</label>
              <PhoneInput
                value={form.whatsapp}
                onChange={(whatsapp) => setForm({ ...form, whatsapp })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Observação</label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="bg-surface-elevated border-border text-foreground placeholder:text-muted-foreground rounded-xl min-h-[80px] resize-none"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="secondary"
              onClick={() => setEditOpen(false)}
              className="bg-surface-elevated text-foreground hover:bg-secondary rounded-xl flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleEdit}
              disabled={submitting || !form.name || !form.whatsapp}
              className="bg-neon text-background hover:bg-neon/90 font-semibold rounded-xl flex-1"
            >
              {submitting ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deactivateOpen} onOpenChange={setDeactivateOpen}>
        <DialogContent className="bg-surface border-border text-foreground sm:max-w-md sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">Desativar cliente</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              <strong className="text-foreground">{selected?.name}</strong> some da sua lista junto com os
              contratos e as parcelas dele: saem do painel, dos relatórios, dos totais e do histórico de
              cobranças, e nada mais é cobrado.{' '}
              <strong className="text-foreground">Nada é apagado</strong> — abra o cliente na aba
              &quot;Desativados&quot; para ver os contratos, e ao reativar tudo volta como estava.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="secondary"
              onClick={() => setDeactivateOpen(false)}
              className="bg-surface-elevated text-foreground hover:bg-secondary rounded-xl flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleDeactivate}
              disabled={submitting}
              className="bg-danger text-white hover:bg-danger/90 font-semibold rounded-xl flex-1"
            >
              {submitting ? 'Desativando...' : 'Desativar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}