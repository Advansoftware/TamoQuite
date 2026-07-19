'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiPost, getApiError } from '@/lib/api';
import { toast } from 'sonner';

/**
 * Asks the platform to send this installment's charge right now. The request
 * goes through the outbound queue, which drains within seconds using whichever
 * connected number is available (the user's own, or the shared TamoQuite pool).
 *
 * On success the toast links straight to the message log, so the user can read
 * exactly what was sent instead of having to hunt for it.
 */
export function useSendCharge() {
  const router = useRouter();
  return useMutation({
    mutationFn: async (installmentId: string) => {
      const res = await apiPost(`/api/settings/billing/charge/${installmentId}`, {});
      const errMsg = await getApiError(res);
      if (errMsg) throw new Error(errMsg);
      return res.json();
    },
    onSuccess: () =>
      toast.success('Cobrança enviada!', {
        description: 'Veja a mensagem e se ela chegou.',
        action: { label: 'Ver mensagem', onClick: () => router.push('/cobrancas') },
      }),
    onError: (e: Error) => toast.error(e.message),
  });
}
