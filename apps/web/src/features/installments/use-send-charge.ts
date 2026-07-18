'use client';

import { useMutation } from '@tanstack/react-query';
import { apiPost, getApiError } from '@/lib/api';
import { toast } from 'sonner';

/**
 * Asks the platform to send this installment's charge right now. The request
 * goes through the outbound queue, which drains within seconds using whichever
 * connected number is available (the user's own, or the shared TamoQuite pool).
 */
export function useSendCharge() {
  return useMutation({
    mutationFn: async (installmentId: string) => {
      const res = await apiPost(`/api/settings/billing/charge/${installmentId}`, {});
      const errMsg = await getApiError(res);
      if (errMsg) throw new Error(errMsg);
      return res.json();
    },
    onSuccess: () => toast.success('Cobrança enviada!'),
    onError: (e: Error) => toast.error(e.message),
  });
}
