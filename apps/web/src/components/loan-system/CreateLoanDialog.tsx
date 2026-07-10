'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiFetch, apiPost, getApiError } from '@/lib/api';
import { formatCurrency, formatPhone } from '@/lib/helpers';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { PhoneInput } from '@/components/ui/phone-input';
import { Percent, ArrowLeftRight, ChevronsUpDown, Check, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

type CalcMode = 'BY_RATE' | 'BY_TOTAL';

interface BorrowerOption {
  id: string;
  name: string;
  whatsapp: string;
}

interface CreateLoanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fixedBorrowerId?: string;
  fixedBorrowerName?: string;
  onSuccess: () => void;
}

function calcFromRate(P: number, r: number, n: number): { total: number; pmt: number } {
  if (r <= 0) return { total: P, pmt: P / n };
  const pmt = P * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
  return { total: pmt * n, pmt };
}

function calcRateFromTotal(P: number, F: number, n: number): number {
  let lo = 0.0001, hi = 0.5; // 0.01% to 50%
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    const { total } = calcFromRate(P, mid, n);
    if (total < F) lo = mid;
    else hi = mid;
  }
  return Math.round(((lo + hi) / 2) * 10000) / 100;
}

export function CreateLoanDialog({
  open,
  onOpenChange,
  fixedBorrowerId,
  fixedBorrowerName,
  onSuccess,
}: CreateLoanDialogProps) {
  const [borrowers, setBorrowers] = useState<BorrowerOption[]>([]);
  const [loadingBorrowers, setLoadingBorrowers] = useState(false);
  const [borrowerOpen, setBorrowerOpen] = useState(false);
  const [borrowerSearch, setBorrowerSearch] = useState('');
  const [personDialogOpen, setPersonDialogOpen] = useState(false);
  const [newPerson, setNewPerson] = useState({ name: '', whatsapp: '' });
  const [creatingPerson, setCreatingPerson] = useState(false);
  const [calcMode, setCalcMode] = useState<CalcMode>('BY_RATE');
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    borrowerId: '',
    originalAmount: '',
    interestRate: '',
    totalAmount: '',
    installmentValue: '',
    installmentCount: '',
    frequency: 'MONTHLY',
    startDate: new Date().toISOString().split('T')[0],
  });

  // Fetch borrowers list if not in fixed mode
  const fetchBorrowers = useCallback(async () => {
    if (fixedBorrowerId) return;
    setLoadingBorrowers(true);
    try {
      const res = await apiFetch('/api/borrowers');
      if (res.ok) {
        setBorrowers(await res.json());
      }
    } catch (err) {
      console.error('Erro ao buscar devedores:', err);
    } finally {
      setLoadingBorrowers(false);
    }
  }, [fixedBorrowerId]);

  const openCreatePerson = () => {
    setNewPerson({ name: borrowerSearch.trim(), whatsapp: '' });
    setBorrowerOpen(false);
    setPersonDialogOpen(true);
  };

  const handleCreatePerson = async () => {
    if (!newPerson.name.trim() || !newPerson.whatsapp.trim()) {
      toast.error('Nome e WhatsApp são obrigatórios');
      return;
    }
    setCreatingPerson(true);
    try {
      const res = await apiPost('/api/borrowers', {
        name: newPerson.name.trim(),
        whatsapp: newPerson.whatsapp.trim(),
      });
      const errMsg = await getApiError(res);
      if (errMsg) { toast.error(errMsg); return; }
      const created = await res.json();
      setBorrowers((prev) => (prev.some((b) => b.id === created.id) ? prev : [created, ...prev]));
      setForm((f) => ({ ...f, borrowerId: created.id }));
      setPersonDialogOpen(false);
      setNewPerson({ name: '', whatsapp: '' });
      setBorrowerSearch('');
      toast.success('Pessoa criada e selecionada!');
    } catch {
      toast.error('Erro de conexão com o servidor');
    } finally {
      setCreatingPerson(false);
    }
  };

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        fetchBorrowers();
        // Reset form state on dialog open
        setForm({
          borrowerId: fixedBorrowerId || '',
          originalAmount: '',
          interestRate: '',
          totalAmount: '',
          installmentValue: '',
          installmentCount: '',
          frequency: 'MONTHLY',
          startDate: new Date().toISOString().split('T')[0],
        });
        setCalcMode('BY_RATE');
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [open, fixedBorrowerId, fetchBorrowers]);

  // Calculations for preview
  const P = parseFloat(form.originalAmount) || 0;
  const n = parseInt(form.installmentCount) || 0;
  const r = parseFloat(form.interestRate) || 0;
  const totalInput = parseFloat(form.totalAmount) || 0;
  const pmtInput = parseFloat(form.installmentValue) || 0;

  const periodNoun = form.frequency === 'WEEKLY' ? 'semana' : form.frequency === 'BIWEEKLY' ? 'quinzena' : 'mês';
  const periodAbbr = form.frequency === 'WEEKLY' ? 'a.s.' : form.frequency === 'BIWEEKLY' ? 'a.q.' : 'a.m.';

  let previewTotal = 0;
  let previewPmt = 0;
  let previewRate = 0;

  if (calcMode === 'BY_RATE' && P > 0 && r > 0 && n > 0) {
    const calc = calcFromRate(P, r / 100, n);
    previewTotal = calc.total;
    previewPmt = calc.pmt;
    previewRate = r;
  } else if (calcMode === 'BY_TOTAL' && P > 0 && totalInput > 0 && n > 0) {
    previewTotal = totalInput;
    previewPmt = totalInput / n;
    previewRate = calcRateFromTotal(P, totalInput, n);
  }

  const handleCreate = async () => {
    const activeBorrowerId = fixedBorrowerId || form.borrowerId;
    let finalRate = 0;
    let finalTotal = 0;

    if (calcMode === 'BY_RATE') {
      finalRate = parseFloat(form.interestRate);
      const calc = calcFromRate(P, finalRate / 100, n);
      finalTotal = calc.total;
    } else {
      finalTotal = totalInput;
      finalRate = calcRateFromTotal(P, totalInput, n);
    }

    if (!activeBorrowerId || !P || !finalRate || !n || !form.startDate) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiPost('/api/loans', {
        borrowerId: activeBorrowerId,
        originalAmount: P,
        interestRate: finalRate,
        installmentCount: n,
        frequency: form.frequency,
        startDate: form.startDate,
      });

      const errMsg = await getApiError(res);
      if (errMsg) {
        toast.error(errMsg);
        return;
      }

      toast.success('Empréstimo criado com sucesso!');
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      console.error(err);
      toast.error('Erro de conexão com o servidor');
    } finally {
      setSubmitting(false);
    }
  };

  const calculatedInstallmentCount = pmtInput > 0 && P > 0 ? Math.max(1, Math.round(totalInput / pmtInput)) : 0;

  // Sync calculated installment count in total mode if installmentValue is provided
  useEffect(() => {
    if (calcMode === 'BY_TOTAL' && pmtInput > 0 && calculatedInstallmentCount > 0) {
      const timer = setTimeout(() => {
        setForm((prev) => ({
          ...prev,
          installmentCount: String(calculatedInstallmentCount),
        }));
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [calcMode, pmtInput, calculatedInstallmentCount]);

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface border-border text-foreground sm:max-w-md sm:rounded-2xl sm:max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Novo Empréstimo</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {fixedBorrowerName ? `Para ${fixedBorrowerName}` : 'Crie um empréstimo com cálculo automático (tabela Price)'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* Borrower Selector - only show if not fixed */}
          {!fixedBorrowerId && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Pessoa *</label>
              <Popover open={borrowerOpen} onOpenChange={setBorrowerOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    role="combobox"
                    aria-expanded={borrowerOpen}
                    aria-controls="borrower-list"
                    disabled={loadingBorrowers}
                    className="bg-surface-elevated border-border text-foreground rounded-xl h-11 w-full flex items-center justify-between px-3 text-sm cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {form.borrowerId
                      ? borrowers.find((b) => b.id === form.borrowerId)?.name
                      : loadingBorrowers ? 'Carregando...' : 'Selecione uma pessoa'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-surface-elevated border-border" align="start">
                  <Command className="bg-surface-elevated">
                    <CommandInput
                      placeholder="Buscar por nome ou telefone..."
                      className="h-9"
                      value={borrowerSearch}
                      onValueChange={setBorrowerSearch}
                    />
                    <CommandList id="borrower-list">
                      <CommandEmpty className="py-4 text-sm">
                        <div className="flex flex-col items-center gap-2 px-3">
                          <span className="text-muted-foreground">Nenhuma pessoa encontrada.</span>
                          <button
                            type="button"
                            onClick={openCreatePerson}
                            className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-neon text-background text-xs font-semibold hover:bg-neon/90 transition-colors cursor-pointer"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            {borrowerSearch.trim() ? `Criar "${borrowerSearch.trim()}"` : 'Criar pessoa'}
                          </button>
                        </div>
                      </CommandEmpty>
                      <CommandGroup>
                        {borrowers.map((b) => (
                          <CommandItem
                            key={b.id}
                            value={`${b.name} ${b.whatsapp}`}
                            onSelect={() => {
                              setForm({ ...form, borrowerId: b.id });
                              setBorrowerOpen(false);
                            }}
                            className="cursor-pointer"
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${form.borrowerId === b.id ? 'opacity-100' : 'opacity-0'}`}
                            />
                            {b.name} — {formatPhone(b.whatsapp)}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Valor Original (R$) *</label>
            <Input 
              type="number" 
              step="0.01" 
              placeholder="Ex: 5000" 
              value={form.originalAmount} 
              onChange={(e) => setForm({ ...form, originalAmount: e.target.value })} 
              className="bg-surface-elevated border-border text-foreground placeholder:text-muted-foreground rounded-xl h-11" 
            />
          </div>

          {/* Calc Mode Toggle */}
          <div className="bg-surface-elevated rounded-xl p-1 flex gap-1">
            <button
              type="button"
              onClick={() => setCalcMode('BY_RATE')}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                calcMode === 'BY_RATE' ? 'bg-neon text-background' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Percent className="w-3.5 h-3.5" />
              Informar Taxa
            </button>
            <button
              type="button"
              onClick={() => setCalcMode('BY_TOTAL')}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                calcMode === 'BY_TOTAL' ? 'bg-neon text-background' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              Informar Total
            </button>
          </div>

          {calcMode === 'BY_RATE' ? (
            <div className="space-y-2">
              <label className="text-sm font-medium">Taxa de Juros (% {periodAbbr}) *</label>
              <Input
                type="number"
                step="0.01"
                placeholder="Ex: 2.5"
                value={form.interestRate}
                onChange={(e) => setForm({ ...form, interestRate: e.target.value })}
                className="bg-surface-elevated border-border text-foreground placeholder:text-muted-foreground rounded-xl h-11"
              />
              <p className="text-xs text-muted-foreground">Taxa por {periodNoun} para cálculo (tabela Price)</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Valor Total a Pagar (R$) *</label>
                <Input 
                  type="number" 
                  step="0.01" 
                  placeholder="Ex: 5500" 
                  value={form.totalAmount} 
                  onChange={(e) => setForm({ ...form, totalAmount: e.target.value })} 
                  className="bg-surface-elevated border-border text-foreground placeholder:text-muted-foreground rounded-xl h-11" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Valor da Parcela (R$) — opcional</label>
                <Input 
                  type="number" 
                  step="0.01" 
                  placeholder="Auto-calculado se vazio" 
                  value={form.installmentValue} 
                  onChange={(e) => setForm({ ...form, installmentValue: e.target.value })} 
                  className="bg-surface-elevated border-border text-foreground placeholder:text-muted-foreground rounded-xl h-11" 
                />
                <p className="text-xs text-muted-foreground">Se preenchido, o número de parcelas será calculado automaticamente</p>
              </div>
            </>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Periodicidade *</label>
            <Select
              value={form.frequency}
              onValueChange={(v) => setForm({ ...form, frequency: v })}
            >
              <SelectTrigger className="w-full bg-surface-elevated border-border text-foreground rounded-xl data-[size=default]:h-11 h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-surface-elevated border-border">
                <SelectItem value="WEEKLY" className="text-foreground">Semanal (a cada 7 dias)</SelectItem>
                <SelectItem value="BIWEEKLY" className="text-foreground">Quinzenal (a cada 15 dias)</SelectItem>
                <SelectItem value="MONTHLY" className="text-foreground">Mensal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              {calcMode === 'BY_RATE' || !form.installmentValue ? (
                <>
                  <label className="text-sm font-medium">Número de Parcelas *</label>
                  <Select 
                    value={form.installmentCount} 
                    onValueChange={(v) => setForm({ ...form, installmentCount: v })}
                  >
                    <SelectTrigger className="w-full bg-surface-elevated border-border text-foreground rounded-xl data-[size=default]:h-11 h-11">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="bg-surface-elevated border-border">
                      {[2, 3, 4, 5, 6, 8, 10, 12, 18, 24, 36].map((num) => (
                        <SelectItem key={num} value={String(num)} className="text-foreground">
                          {num} parcelas
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              ) : (
                <>
                  <label className="text-sm font-medium">Parcelas (auto)</label>
                  <div className="h-11 px-4 bg-surface-elevated/50 border border-border rounded-xl flex items-center text-sm text-muted-foreground">
                    {calculatedInstallmentCount > 0 ? `${calculatedInstallmentCount} parcelas` : '—'}
                  </div>
                </>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">1º Vencimento *</label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="bg-surface-elevated border-border text-foreground placeholder:text-muted-foreground rounded-xl h-11"
              />
              <p className="text-xs text-muted-foreground">Data de vencimento da 1ª parcela. As próximas seguem a periodicidade.</p>
            </div>
          </div>

          {/* Preview */}
          {(previewTotal > 0 || previewPmt > 0) && (
            <div className="bg-neon-dim rounded-xl p-4 border border-neon/20 space-y-2">
              <p className="text-xs text-neon font-medium">💰 Prévia do Cálculo</p>
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">Valor original</span>
                <span className="text-xs text-foreground font-medium">{formatCurrency(P)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">Taxa equivalente</span>
                <span className="text-xs text-foreground font-medium">{previewRate.toFixed(2)}% {periodAbbr}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">Total com juros</span>
                <span className="text-xs text-neon font-medium">{formatCurrency(previewTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-muted-foreground">Valor por parcela</span>
                <span className="text-xs text-neon font-bold">{formatCurrency(previewPmt)}</span>
              </div>
              <div className="flex justify-between border-t border-neon/10 pt-2 mt-2">
                <span className="text-xs text-muted-foreground">Custo dos juros</span>
                <span className="text-xs text-warning font-medium">{formatCurrency(previewTotal - P)}</span>
              </div>
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button 
            variant="secondary" 
            onClick={() => onOpenChange(false)} 
            className="bg-surface-elevated text-foreground hover:bg-secondary rounded-xl flex-1 cursor-pointer"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleCreate}
            disabled={submitting || !(fixedBorrowerId || form.borrowerId) || !P || !n || (calcMode === 'BY_RATE' && !r) || (calcMode === 'BY_TOTAL' && !totalInput)}
            className="bg-neon text-background hover:bg-neon/90 font-semibold rounded-xl flex-1 cursor-pointer"
          >
            {submitting ? 'Criando...' : 'Criar Empréstimo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Nested "create person" dialog — shown from the borrower search when no one is found */}
    <Dialog open={personDialogOpen} onOpenChange={setPersonDialogOpen}>
      <DialogContent className="bg-surface border-border text-foreground sm:max-w-md sm:rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Nova Pessoa</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Cadastre a pessoa para usar neste empréstimo
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nome *</label>
            <Input
              value={newPerson.name}
              onChange={(e) => setNewPerson({ ...newPerson, name: e.target.value })}
              placeholder="Nome da pessoa"
              className="bg-surface-elevated border-border text-foreground placeholder:text-muted-foreground rounded-xl h-11"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">WhatsApp *</label>
            <PhoneInput
              value={newPerson.whatsapp}
              onChange={(whatsapp) => setNewPerson({ ...newPerson, whatsapp })}
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button
            variant="secondary"
            onClick={() => setPersonDialogOpen(false)}
            className="bg-surface-elevated text-foreground hover:bg-secondary rounded-xl flex-1 cursor-pointer"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleCreatePerson}
            disabled={creatingPerson || !newPerson.name.trim() || !newPerson.whatsapp.trim()}
            className="bg-neon text-background hover:bg-neon/90 font-semibold rounded-xl flex-1 cursor-pointer"
          >
            {creatingPerson ? 'Criando...' : 'Criar e Selecionar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
