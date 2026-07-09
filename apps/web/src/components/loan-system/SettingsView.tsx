'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch, apiPost, apiPut, getApiError } from '@/lib/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Smartphone, MessageSquare, Loader2, CheckCircle2, XCircle, QrCode, CreditCard, Calendar, ExternalLink, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

type WhatsappStatus = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED';

interface BillingSettings {
  remindBeforeEnabled: boolean;
  daysBefore: number;
  sendOnDueDate: boolean;
  overdueEnabled: boolean;
  overdueIntervalDays: number;
  maxOverdueMessages: number;
  sendHour: number;
  reminderTemplate: string;
  dueTemplate: string;
  overdueTemplate: string;
}

const PLACEHOLDER_HINT =
  'Variáveis: {{nome}}, {{valor}}, {{vencimento}}, {{parcela}}, {{total}}';

function WhatsappTab() {
  const [status, setStatus] = useState<WhatsappStatus>('DISCONNECTED');
  const [qrcode, setQrcode] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await apiFetch('/api/whatsapp/status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data.status);
        if (data.status === 'CONNECTED') {
          setQrcode(null);
          setPairingCode(null);
        }
        return data.status as WhatsappStatus;
      }
    } catch { /* ignore */ }
    return null;
  }, []);

  useEffect(() => {
    fetchStatus();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchStatus]);

  const startPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const s = await fetchStatus();
      if (s === 'CONNECTED' && pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
        toast.success('WhatsApp conectado!');
      }
    }, 3000);
  };

  const handleConnect = async () => {
    setLoading(true);
    try {
      const res = await apiPost('/api/whatsapp/connect', {});
      if (!res.ok) {
        toast.error((await getApiError(res)) || 'Erro ao conectar');
        return;
      }
      const data = await res.json();
      setStatus('CONNECTING');
      setQrcode(data.qrcode || null);
      setPairingCode(data.pairingCode || null);
      startPolling();
    } catch {
      toast.error('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      await apiPost('/api/whatsapp/disconnect', {});
      setStatus('DISCONNECTED');
      setQrcode(null);
      setPairingCode(null);
      if (pollRef.current) clearInterval(pollRef.current);
      toast.success('WhatsApp desconectado');
    } finally {
      setLoading(false);
    }
  };

  const qrSrc = qrcode
    ? qrcode.startsWith('data:')
      ? qrcode
      : `data:image/png;base64,${qrcode}`
    : null;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 p-4 rounded-2xl bg-surface border border-border">
        {status === 'CONNECTED' ? (
          <CheckCircle2 className="w-6 h-6 text-neon shrink-0" />
        ) : status === 'CONNECTING' ? (
          <Loader2 className="w-6 h-6 text-warning shrink-0 animate-spin" />
        ) : (
          <XCircle className="w-6 h-6 text-muted-foreground shrink-0" />
        )}
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">
            {status === 'CONNECTED'
              ? 'WhatsApp conectado'
              : status === 'CONNECTING'
                ? 'Aguardando leitura do QR code…'
                : 'WhatsApp desconectado'}
          </p>
          <p className="text-xs text-muted-foreground">
            As cobranças automáticas saem do seu WhatsApp conectado.
          </p>
        </div>
      </div>

      {qrSrc && status !== 'CONNECTED' && (
        <div className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrSrc} alt="QR code do WhatsApp" className="w-56 h-56" />
          <p className="text-xs text-black/60 text-center">
            Abra o WhatsApp → Aparelhos conectados → Conectar aparelho e escaneie.
          </p>
        </div>
      )}

      {pairingCode && status !== 'CONNECTED' && (
        <div className="p-3 rounded-xl bg-surface border border-border text-center">
          <p className="text-xs text-muted-foreground mb-1">Código de pareamento</p>
          <p className="text-lg font-bold tracking-widest text-foreground">{pairingCode}</p>
        </div>
      )}

      <div className="flex gap-2">
        {status === 'CONNECTED' ? (
          <Button
            onClick={handleDisconnect}
            disabled={loading}
            variant="secondary"
            className="flex-1 bg-danger/10 text-danger hover:bg-danger/20 rounded-xl"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Desconectar'}
          </Button>
        ) : (
          <Button
            onClick={handleConnect}
            disabled={loading}
            className="flex-1 bg-neon text-background hover:bg-neon/90 font-semibold rounded-xl"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <QrCode className="w-4 h-4 mr-1" /> Conectar / Gerar QR
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

function BillingTab() {
  const [settings, setSettings] = useState<BillingSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch('/api/settings/billing');
        if (res.ok) setSettings(await res.json());
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const patch = (p: Partial<BillingSettings>) =>
    setSettings((s) => (s ? { ...s, ...p } : s));

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const res = await apiPut('/api/settings/billing', settings);
      if (!res.ok) {
        toast.error((await getApiError(res)) || 'Erro ao salvar');
        return;
      }
      toast.success('Configurações salvas!');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-neon" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Lembrete antes do vencimento */}
      <div className="p-4 rounded-2xl bg-surface border border-border space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Lembrete antes do vencimento</p>
            <p className="text-xs text-muted-foreground">Avisa o devedor alguns dias antes.</p>
          </div>
          <Switch
            checked={settings.remindBeforeEnabled}
            onCheckedChange={(v) => patch({ remindBeforeEnabled: v })}
          />
        </div>
        {settings.remindBeforeEnabled && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Dias antes:</span>
            <Input
              type="number"
              min={1}
              value={settings.daysBefore}
              onChange={(e) => patch({ daysBefore: Number(e.target.value) })}
              className="w-20 bg-surface-elevated border-border rounded-xl h-9"
            />
          </div>
        )}
      </div>

      {/* No dia do vencimento */}
      <div className="p-4 rounded-2xl bg-surface border border-border flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">Cobrança no dia do vencimento</p>
          <p className="text-xs text-muted-foreground">Envia mensagem no próprio dia.</p>
        </div>
        <Switch
          checked={settings.sendOnDueDate}
          onCheckedChange={(v) => patch({ sendOnDueDate: v })}
        />
      </div>

      {/* Após o vencimento */}
      <div className="p-4 rounded-2xl bg-surface border border-border space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Cobrança após o vencimento</p>
            <p className="text-xs text-muted-foreground">Repete até você marcar &quot;não cobrar&quot; ou a parcela ser paga.</p>
          </div>
          <Switch
            checked={settings.overdueEnabled}
            onCheckedChange={(v) => patch({ overdueEnabled: v })}
          />
        </div>
        {settings.overdueEnabled && (
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">A cada (dias):</span>
              <Input
                type="number"
                min={1}
                value={settings.overdueIntervalDays}
                onChange={(e) => patch({ overdueIntervalDays: Number(e.target.value) })}
                className="w-20 bg-surface-elevated border-border rounded-xl h-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Máx. mensagens (0 = ilimitado):</span>
              <Input
                type="number"
                min={0}
                value={settings.maxOverdueMessages}
                onChange={(e) => patch({ maxOverdueMessages: Number(e.target.value) })}
                className="w-20 bg-surface-elevated border-border rounded-xl h-9"
              />
            </div>
          </div>
        )}
      </div>

      {/* Horário de envio */}
      <div className="p-4 rounded-2xl bg-surface border border-border flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">Horário de envio</p>
          <p className="text-xs text-muted-foreground">Hora do dia (0–23) em que as cobranças são enviadas.</p>
        </div>
        <Input
          type="number"
          min={0}
          max={23}
          value={settings.sendHour}
          onChange={(e) => patch({ sendHour: Number(e.target.value) })}
          className="w-20 bg-surface-elevated border-border rounded-xl h-9"
        />
      </div>

      {/* Templates */}
      <div className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Mensagem de lembrete</label>
          <Textarea
            value={settings.reminderTemplate}
            onChange={(e) => patch({ reminderTemplate: e.target.value })}
            className="bg-surface-elevated border-border rounded-xl min-h-[80px]"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Mensagem de vencimento</label>
          <Textarea
            value={settings.dueTemplate}
            onChange={(e) => patch({ dueTemplate: e.target.value })}
            className="bg-surface-elevated border-border rounded-xl min-h-[80px]"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Mensagem de atraso</label>
          <Textarea
            value={settings.overdueTemplate}
            onChange={(e) => patch({ overdueTemplate: e.target.value })}
            className="bg-surface-elevated border-border rounded-xl min-h-[80px]"
          />
        </div>
        <p className="text-xs text-muted-foreground">{PLACEHOLDER_HINT}</p>
      </div>

      <Button
        onClick={save}
        disabled={saving}
        className="w-full bg-neon text-background hover:bg-neon/90 font-semibold rounded-xl h-11"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar configurações'}
      </Button>
    </div>
  );
}

interface SubscriptionInfo {
  status: string;
  hasSubscription: boolean;
  currentPeriodEnd: number | null;
  cancelAtPeriodEnd: boolean;
  amount: number | null;
  currency: string | null;
  interval: string | null;
}

const STATUS_LABEL: Record<string, { label: string; tone: 'ok' | 'warn' | 'bad' }> = {
  active: { label: 'Ativa', tone: 'ok' },
  trialing: { label: 'Em período de teste', tone: 'ok' },
  past_due: { label: 'Pagamento pendente', tone: 'warn' },
  incomplete: { label: 'Incompleta', tone: 'warn' },
  unpaid: { label: 'Não paga', tone: 'bad' },
  canceled: { label: 'Cancelada', tone: 'bad' },
  INACTIVE: { label: 'Inativa', tone: 'bad' },
};

const INTERVAL_LABEL: Record<string, string> = {
  day: 'dia',
  week: 'semana',
  month: 'mês',
  year: 'ano',
};

function SubscriptionTab() {
  const [info, setInfo] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch('/api/stripe/subscription');
        if (res.ok) setInfo(await res.json());
      } catch { /* ignore */ } finally {
        setLoading(false);
      }
    })();
  }, []);

  const openPortal = async () => {
    setOpening(true);
    try {
      const res = await apiPost('/api/stripe/portal', {});
      if (!res.ok) {
        toast.error((await getApiError(res)) || 'Erro ao abrir o portal de assinatura');
        setOpening(false);
        return;
      }
      const { url } = await res.json();
      window.location.href = url;
    } catch {
      toast.error('Erro de conexão ao abrir o portal');
      setOpening(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const status = info?.status ?? 'INACTIVE';
  const meta = STATUS_LABEL[status] ?? { label: status, tone: 'warn' as const };
  const toneClass =
    meta.tone === 'ok'
      ? 'bg-neon-dim text-neon'
      : meta.tone === 'warn'
        ? 'bg-amber-500/15 text-amber-400'
        : 'bg-red-500/15 text-red-400';

  const renewLabel = info?.cancelAtPeriodEnd ? 'Acesso até' : 'Próxima cobrança';
  const renewDate =
    info?.currentPeriodEnd != null
      ? new Date(info.currentPeriodEnd * 1000).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        })
      : null;
  const priceLabel =
    info?.amount != null && info.currency
      ? `${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: info.currency.toUpperCase() }).format(
          info.amount / 100,
        )}${info.interval ? ` / ${INTERVAL_LABEL[info.interval] ?? info.interval}` : ''}`
      : null;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-neon-dim flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-neon" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Plano Completo</p>
              {priceLabel && <p className="text-xs text-muted-foreground">{priceLabel}</p>}
            </div>
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${toneClass}`}>{meta.label}</span>
        </div>

        {renewDate && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>
              {renewLabel}: <span className="text-foreground font-medium">{renewDate}</span>
            </span>
          </div>
        )}

        {info?.cancelAtPeriodEnd && (
          <div className="flex items-start gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-300">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Sua assinatura será cancelada ao fim do período atual. Você pode reativá-la no portal.</span>
          </div>
        )}
      </div>

      <Button
        onClick={openPortal}
        disabled={opening || !info?.hasSubscription}
        className="w-full bg-neon text-background hover:bg-neon/90 font-semibold rounded-xl h-11"
      >
        {opening ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            <ExternalLink className="w-4 h-4 mr-2" /> Gerenciar assinatura
          </>
        )}
      </Button>

      <p className="text-xs text-muted-foreground text-center leading-relaxed">
        No portal seguro da Stripe você pode atualizar o cartão, ver faturas, cancelar ou reativar sua assinatura.
      </p>
    </div>
  );
}

export function SettingsView() {
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground">Conexão do WhatsApp, cobranças automáticas e assinatura.</p>
      </div>

      <Tabs defaultValue="whatsapp" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-surface">
          <TabsTrigger value="whatsapp" className="data-[state=active]:bg-neon-dim data-[state=active]:text-neon">
            <Smartphone className="w-4 h-4 mr-1.5" /> WhatsApp
          </TabsTrigger>
          <TabsTrigger value="billing" className="data-[state=active]:bg-neon-dim data-[state=active]:text-neon">
            <MessageSquare className="w-4 h-4 mr-1.5" /> Cobrança
          </TabsTrigger>
          <TabsTrigger value="subscription" className="data-[state=active]:bg-neon-dim data-[state=active]:text-neon">
            <CreditCard className="w-4 h-4 mr-1.5" /> Assinatura
          </TabsTrigger>
        </TabsList>
        <TabsContent value="whatsapp" className="mt-4">
          <WhatsappTab />
        </TabsContent>
        <TabsContent value="billing" className="mt-4">
          <BillingTab />
        </TabsContent>
        <TabsContent value="subscription" className="mt-4">
          <SubscriptionTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
