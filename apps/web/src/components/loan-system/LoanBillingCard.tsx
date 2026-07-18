'use client';

import { useEffect, useState } from 'react';
import { apiFetch, apiPut, getApiError } from '@/lib/api';
import { Bell } from 'lucide-react';
import { toast } from 'sonner';

type LoanWhatsappMode = 'MANUAL' | 'OWN' | 'GLOBAL';

/** What the user picks in this card — one question instead of a toggle + a mode picker. */
type Choice = 'INHERIT' | 'OWN' | 'GLOBAL' | 'OFF';

const CHOICES: { value: Choice; label: string; desc: string }[] = [
  { value: 'INHERIT', label: 'Seguir minhas configurações', desc: '' },
  { value: 'OWN', label: 'Enviar pelo meu WhatsApp', desc: 'Sai do seu número conectado.' },
  {
    value: 'GLOBAL',
    label: 'Enviar pelo número TamoQuite',
    desc: 'Sai do número da plataforma, dizendo que a cobrança é sua.',
  },
  {
    value: 'OFF',
    label: 'Não cobrar automaticamente',
    desc: 'Nada é enviado sozinho. Você ainda pode cobrar pelo link do WhatsApp.',
  },
];

const DEFAULT_HINT: Record<string, string> = {
  OWN: 'Hoje: pelo seu WhatsApp',
  GLOBAL: 'Hoje: pelo número TamoQuite',
  MANUAL: 'Hoje: nenhum envio automático',
};

function toChoice(doNotCharge: boolean, mode: LoanWhatsappMode | null): Choice {
  if (doNotCharge || mode === 'MANUAL') return 'OFF';
  if (mode === 'OWN' || mode === 'GLOBAL') return mode;
  return 'INHERIT';
}

export function LoanBillingCard({
  loanId,
  initialDoNotCharge,
  initialWhatsappMode,
}: {
  loanId: string;
  initialDoNotCharge: boolean;
  initialWhatsappMode: LoanWhatsappMode | null;
}) {
  const [choice, setChoice] = useState<Choice>(toChoice(initialDoNotCharge, initialWhatsappMode));
  const [defaultMode, setDefaultMode] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Show what "seguir minhas configurações" actually resolves to right now.
  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch('/api/settings/billing');
        if (res.ok) setDefaultMode((await res.json()).whatsappMode ?? null);
      } catch { /* ignore — the hint is optional */ }
    })();
  }, []);

  const select = async (value: Choice) => {
    if (value === choice || saving) return;
    const prev = choice;
    setChoice(value);
    setSaving(true);
    try {
      const res = await apiPut(`/api/loans/${loanId}/billing`, {
        doNotCharge: value === 'OFF',
        whatsappMode: value === 'OWN' || value === 'GLOBAL' ? value : null,
      });
      if (!res.ok) {
        setChoice(prev);
        toast.error((await getApiError(res)) || 'Erro ao salvar');
        return;
      }
      toast.success('Cobrança deste contrato atualizada');
    } catch {
      setChoice(prev);
      toast.error('Erro de conexão');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-surface rounded-2xl p-4 border border-border space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
          <Bell className="w-4 h-4 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Cobrança automática deste contrato</p>
          <p className="text-xs text-muted-foreground">Como as mensagens deste empréstimo são enviadas.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {CHOICES.map((c) => {
          const active = choice === c.value;
          const desc =
            c.value === 'INHERIT'
              ? (defaultMode && DEFAULT_HINT[defaultMode]) || 'Usa o que está nas suas Configurações.'
              : c.desc;
          return (
            <button
              key={c.value}
              type="button"
              disabled={saving}
              onClick={() => select(c.value)}
              className={`text-left p-3 rounded-xl border transition-colors disabled:opacity-60 ${
                active
                  ? 'border-neon bg-neon-dim'
                  : 'border-border bg-surface-elevated hover:border-muted-foreground/40'
              }`}
            >
              <p className={`text-sm font-semibold ${active ? 'text-neon' : 'text-foreground'}`}>{c.label}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
