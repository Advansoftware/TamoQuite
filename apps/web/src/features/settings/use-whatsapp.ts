import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiJson, apiPost, resolveJson } from '@/lib/api';
import { qk } from '@/lib/query-keys';
import type { WhatsappStatus } from './types';

interface StatusResponse {
  status: WhatsappStatus;
}

interface ConnectResponse {
  qrcode?: string | null;
  pairingCode?: string | null;
}

/**
 * WhatsApp connection status. When `polling` is on, React Query refetches every
 * few seconds (replacing the old imperative setInterval) until it reports
 * CONNECTED, at which point the caller can turn polling off.
 */
export function useWhatsappStatus(polling: boolean) {
  return useQuery({
    queryKey: qk.whatsappStatus,
    queryFn: () => apiJson<StatusResponse>('/api/whatsapp/status'),
    refetchInterval: polling ? 3000 : false,
  });
}

export function useConnectWhatsapp() {
  return useMutation({
    mutationFn: () => apiPost('/api/whatsapp/connect', {}).then((r) => resolveJson<ConnectResponse>(r)),
  });
}

export function useDisconnectWhatsapp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiPost('/api/whatsapp/disconnect', {}).then((r) => resolveJson<unknown>(r)),
    onSuccess: () => qc.setQueryData(qk.whatsappStatus, { status: 'DISCONNECTED' }),
  });
}
