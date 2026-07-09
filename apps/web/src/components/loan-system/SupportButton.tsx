'use client';

import { useState } from 'react';
import { Mail, HelpCircle, Copy, Check, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function SupportButton() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const email = 'contato@tamoquite.app';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      toast.success('E-mail copiado para a área de transferência!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Erro ao copiar e-mail.');
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 w-12 h-12 rounded-full bg-surface-elevated/85 backdrop-blur-md border border-neon/30 hover:border-neon text-neon flex items-center justify-center shadow-[0_4px_20px_rgba(0,255,163,0.15)] hover:shadow-[0_0_25px_rgba(0,255,163,0.35)] transition-all duration-300 active:scale-95 group cursor-pointer"
        title="Suporte e Feedback"
      >
        <HelpCircle className="w-6 h-6 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110" />
      </button>

      {/* Support Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-surface border-border text-foreground sm:max-w-md sm:rounded-2xl">
          <DialogHeader className="space-y-3">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-neon-dim border border-neon/20 flex items-center justify-center">
              <Mail className="w-6 h-6 text-neon" />
            </div>
            <DialogTitle className="text-lg font-bold text-center">Suporte & Feedback</DialogTitle>
            <DialogDescription className="text-muted-foreground text-center text-sm">
              Tem alguma dúvida, encontrou um problema ou tem alguma sugestão para o <strong className="text-foreground">TamoQuite</strong>? Estamos aqui para ajudar!
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-surface-elevated rounded-2xl p-4 border border-border flex items-center justify-between gap-4">
              <div className="min-w-0">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">E-mail de Contato</span>
                <p className="text-sm font-semibold text-foreground truncate select-all">{email}</p>
              </div>
              <Button
                variant="secondary"
                size="icon"
                onClick={handleCopy}
                className="bg-surface hover:bg-secondary border border-border rounded-xl shrink-0 h-9 w-9 transition-colors"
                title="Copiar e-mail"
              >
                {copied ? <Check className="w-4 h-4 text-neon" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => setOpen(false)}
                className="bg-surface-elevated text-foreground hover:bg-secondary border border-border rounded-xl flex-1 h-11 text-xs font-semibold cursor-pointer"
              >
                Fechar
              </Button>
              <a
                href={`mailto:${email}?subject=Suporte/Feedback%20-%20TamoQuite`}
                className="flex-1 flex items-center justify-center gap-2 h-11 bg-neon hover:bg-neon/90 text-background rounded-xl text-xs font-bold transition-all shadow-[0_0_15px_rgba(0,255,163,0.2)] hover:shadow-[0_0_20px_rgba(0,255,163,0.3)] active:scale-[0.98] cursor-pointer"
              >
                <ExternalLink className="w-4 h-4" />
                Enviar E-mail
              </a>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
