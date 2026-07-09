'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch, apiPost, apiPut, getApiError } from '@/lib/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Smartphone, MessageSquare, Loader2, CheckCircle2, XCircle, QrCode } from 'lucide-react';
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

export function SettingsView() {
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground">Conexão do WhatsApp e cobranças automáticas.</p>
      </div>

      <Tabs defaultValue="whatsapp" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-surface">
          <TabsTrigger value="whatsapp" className="data-[state=active]:bg-neon-dim data-[state=active]:text-neon">
            <Smartphone className="w-4 h-4 mr-1.5" /> WhatsApp
          </TabsTrigger>
          <TabsTrigger value="billing" className="data-[state=active]:bg-neon-dim data-[state=active]:text-neon">
            <MessageSquare className="w-4 h-4 mr-1.5" /> Cobrança
          </TabsTrigger>
        </TabsList>
        <TabsContent value="whatsapp" className="mt-4">
          <WhatsappTab />
        </TabsContent>
        <TabsContent value="billing" className="mt-4">
          <BillingTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
