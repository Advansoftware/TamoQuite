'use client';

import { useState } from 'react';
import { Share2, Copy, Check, Link2Off, MessageCircle, Eye } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ActionButton } from '@/components/ui/action-button';
import { Spinner } from '@/components/ui/spinner';
import { useShare, useEnableShare, useRevokeShare, shareUrl } from '@/features/loans/use-share';
import { toE164Digits } from '@/lib/phone';
import { formatDate } from '@/lib/helpers';

/**
 * The single "compartilhar contrato" affordance. Owns the whole lifecycle of the
 * public link — create, copy, send, revoke — so any screen that shows a contract
 * can drop it in without repeating the wiring.
 */
export function ShareContractButton({
  loanId,
  borrowerName,
  borrowerPhone,
}: {
  loanId: string;
  borrowerName: string;
  borrowerPhone?: string;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useShare(loanId);
  const enable = useEnableShare(loanId);
  const revoke = useRevokeShare(loanId);

  const url = data?.active && data.token ? shareUrl(data.token) : null;

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Link copiado!');
    } catch {
      toast.error('Não foi possível copiar. Selecione o link e copie manualmente.');
    }
  };

  const sendWhatsapp = () => {
    if (!url) return;
    const text = encodeURIComponent(
      `Olá, ${borrowerName}! Aqui você acompanha o nosso contrato e as parcelas: ${url}`,
    );
    const digits = borrowerPhone ? toE164Digits(borrowerPhone) : '';
    window.open(digits ? `https://wa.me/${digits}?text=${text}` : `https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <>
      <ActionButton onClick={() => setOpen(true)}>
        <Share2 className="w-4 h-4" />
        Compartilhar
      </ActionButton>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-surface border-border text-foreground sm:max-w-md sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Compartilhar contrato</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Gere um link para {borrowerName} acompanhar as parcelas. Quem abrir o link
              <strong className="text-foreground"> só consegue ver</strong> — ninguém altera nada por lá.
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : url ? (
            <div className="space-y-3 py-2">
              <div className="bg-surface-elevated border border-border rounded-xl p-3">
                <p className="text-xs text-muted-foreground mb-1">Link do contrato</p>
                <p className="text-xs text-foreground break-all font-mono">{url}</p>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={copy}
                  className="flex-1 bg-surface-elevated text-foreground hover:bg-secondary rounded-xl h-11"
                >
                  {copied ? <Check className="w-4 h-4 text-neon" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copiado' : 'Copiar'}
                </Button>
                <Button
                  onClick={sendWhatsapp}
                  className="flex-1 bg-neon text-background hover:bg-neon/90 font-semibold rounded-xl h-11"
                >
                  <MessageCircle className="w-4 h-4" />
                  Enviar
                </Button>
              </div>

              {typeof data?.viewCount === 'number' && (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Eye className="w-3.5 h-3.5" />
                  {data.viewCount === 0
                    ? 'Ainda não foi aberto.'
                    : `Aberto ${data.viewCount === 1 ? '1 vez' : `${data.viewCount} vezes`}${
                        data.lastViewedAt ? ` · última em ${formatDate(data.lastViewedAt)}` : ''
                      }.`}
                </p>
              )}

              <button
                onClick={() => revoke.mutate(undefined, {
                  onSuccess: () => toast.success('Link desativado. Quem tinha o endereço não consegue mais abrir.'),
                  onError: () => toast.error('Não foi possível desativar. Tente de novo.'),
                })}
                disabled={revoke.isPending}
                className="flex items-center justify-center gap-2 w-full h-11 rounded-xl bg-danger/10 text-danger text-sm font-medium hover:bg-danger/20 transition-colors disabled:opacity-60 cursor-pointer"
              >
                <Link2Off className="w-4 h-4" />
                {revoke.isPending ? 'Desativando...' : 'Desativar este link'}
              </button>
              <p className="text-xs text-muted-foreground text-center">
                Ao desativar, o endereço para de funcionar. Você pode gerar um novo quando quiser.
              </p>
            </div>
          ) : (
            <div className="space-y-3 py-2">
              <Button
                onClick={() => enable.mutate(undefined, {
                  onError: () => toast.error('Não foi possível gerar o link. Tente de novo.'),
                })}
                disabled={enable.isPending}
                className="w-full bg-neon text-background hover:bg-neon/90 font-semibold rounded-xl h-11"
              >
                {enable.isPending ? 'Gerando...' : 'Gerar link'}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Só quem receber o link consegue abrir. Você pode desativá-lo a qualquer momento.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
