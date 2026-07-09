'use client';

import { useState } from 'react';
import { apiPut, getApiError } from '@/lib/api';
import { Switch } from '@/components/ui/switch';
import { BellOff } from 'lucide-react';
import { toast } from 'sonner';

export function LoanBillingCard({
  loanId,
  initialDoNotCharge,
}: {
  loanId: string;
  initialDoNotCharge: boolean;
}) {
  const [doNotCharge, setDoNotCharge] = useState(initialDoNotCharge);
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

  return (
    <div className="bg-surface rounded-2xl p-4 border border-border flex items-center justify-between">
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
  );
}
