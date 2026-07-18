'use client';

import { MessageCircle, Send } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { generateChargeMessage, generateWhatsAppLink } from '@/lib/helpers';
import { useSendCharge } from '@/features/installments/use-send-charge';
import { cn } from '@/lib/utils';

interface ChargeButtonProps {
  installmentId: string;
  borrowerName: string;
  borrowerWhatsapp: string;
  amount: number;
  dueDate: string;
  /** 'icon' for dense installment rows, 'label' for cards with room for text. */
  variant?: 'icon' | 'label';
  className?: string;
}

/**
 * The single "Cobrar" affordance used across the app. Offers both ways to
 * charge — let the platform send it, or open WhatsApp and send it yourself —
 * so the dashboard and the loan screens never drift apart again.
 */
export function ChargeButton({
  installmentId,
  borrowerName,
  borrowerWhatsapp,
  amount,
  dueDate,
  variant = 'label',
  className,
}: ChargeButtonProps) {
  const sendCharge = useSendCharge();
  const waLink = generateWhatsAppLink(
    borrowerWhatsapp,
    generateChargeMessage(borrowerName, amount, dueDate),
  );
  const pending = sendCharge.isPending;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={pending}
          // Cards on the dashboard are themselves clickable.
          onClick={(e) => e.stopPropagation()}
          title="Cobrar via WhatsApp"
          className={cn(
            'flex items-center justify-center bg-whatsapp/10 hover:bg-whatsapp/20 text-whatsapp',
            'rounded-xl transition active:scale-[0.97] shrink-0 outline-none cursor-pointer disabled:opacity-60',
            variant === 'icon'
              ? 'w-11 h-11 sm:w-10 sm:h-10'
              : 'gap-1.5 h-11 sm:h-9 px-3 text-xs font-semibold',
            className,
          )}
        >
          {pending ? (
            <span className="w-4 h-4 border-2 border-whatsapp/30 border-t-whatsapp rounded-full animate-spin" />
          ) : (
            <MessageCircle className="w-4 h-4" />
          )}
          {variant === 'label' && !pending && 'Cobrar'}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        onClick={(e) => e.stopPropagation()}
        className="bg-surface border-border text-foreground w-64"
      >
        <DropdownMenuItem
          onClick={() => sendCharge.mutate(installmentId)}
          className="cursor-pointer focus:bg-secondary/40 flex-col items-start gap-0.5 py-2"
        >
          <span className="flex items-center gap-2 font-medium">
            <Send className="w-4 h-4 text-neon" />
            O sistema cobra por mim
          </span>
          <span className="text-[11px] text-muted-foreground pl-6">Envia a mensagem agora, automático.</span>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer focus:bg-secondary/40">
          <a href={waLink} target="_blank" rel="noopener noreferrer" className="flex-col items-start gap-0.5 py-2">
            <span className="flex items-center gap-2 font-medium">
              <MessageCircle className="w-4 h-4 text-whatsapp" />
              Eu mesmo envio
            </span>
            <span className="text-[11px] text-muted-foreground pl-6">Abre o WhatsApp com a mensagem pronta.</span>
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
