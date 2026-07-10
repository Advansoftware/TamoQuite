'use client';

import { useState } from 'react';
import { apiPut, getApiError } from '@/lib/api';
import { Switch } from '@/components/ui/switch';
import { BellOff } from 'lucide-react';
import { toast } from 'sonner';

type LoanWhatsappMode = 'MANUAL' | 'OWN' | 'GLOBAL';

const MODE_CHOICES: { value: LoanWhatsappMode | 'INHERIT'; label: string }[] = [
  { value: 'INHERIT', label: 'Padrão' },
  { value: 'OWN', label: 'Meu nº' },
  { value: 'GLOBAL', label: 'TamoQuite' },
  { value: 'MANUAL', label: 'Manual' },
];

export function LoanBillingCard({
  loanId,
  initialDoNotCharge,
  initialWhatsappMode,
}: {
  loanId: string;
  initialDoNotCharge: boolean;
  initialWhatsappMode: LoanWhatsappMode | null;
}) {
  const [doNotCharge, setDoNotCharge] = useState(initialDoNotCharge);
  const [mode, setMode] = useState<LoanWhatsappMode | 'INHERIT'>(initialWhatsappMode ?? 'INHERIT');
  const [saving, setSaving] = useState(false);

  const toggle = async (value: boolean) => {
    setSaving(true);
    setDoNotCharge(value);
    try {
      const res = await apiPut(`/api/loans/${loanId}/billing`, { doNotCharge: value });
      if (!res.ok) {
        setDoNotCharge(!value);
        toast.error((await getApiError(res)) || 'Erro ao salvar');
        return;
      }
      toast.success(value ? 'Cobrança automática pausada para este contrato' : 'Cobrança automática reativada');
    } catch {
      setDoNotCharge(!value);
      toast.error('Erro de conexão');
    } finally {
      setSaving(false);
    }
  };

  const changeMode = async (value: LoanWhatsappMode | 'INHERIT') => {
    const prev = mode;
    setMode(value);
    try {
      const res = await apiPut(`/api/loans/${loanId}/billing`, {
        whatsappMode: value === 'INHERIT' ? null : value,
      });
      if (!res.ok) {
        setMode(prev);
        toast.error((await getApiError(res)) || 'Erro ao salvar');
      }
    } catch {
      setMode(prev);
      toast.error('Erro de conexão');
    }
  };

  return (
    <div className="bg-surface rounded-2xl p-4 border border-border space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center">
            <BellOff className="w-4 h-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Não cobrar este contrato</p>
            <p className="text-xs text-muted-foreground">Pausa as cobranças automáticas por WhatsApp deste empréstimo.</p>
          </div>
        </div>
        <Switch checked={doNotCharge} disabled={saving} onCheckedChange={toggle} />
      </div>

      {!doNotCharge && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Enviar cobranças deste contrato por:</p>
          <div className="grid grid-cols-4 gap-1.5">
            {MODE_CHOICES.map((c) => {
              const active = mode === c.value;
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => changeMode(c.value)}
                  className={`py-2 rounded-lg text-xs font-medium border transition-colors ${
                    active
                      ? 'border-neon bg-neon-dim text-neon'
                      : 'border-border bg-surface-elevated text-muted-foreground hover:border-muted-foreground/40'
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-muted-foreground">
            &quot;Padrão&quot; usa o modo definido nas suas Configurações de cobrança.
          </p>
        </div>
      )}
    </div>
  );
}
