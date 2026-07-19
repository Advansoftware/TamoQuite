import type { Metadata } from 'next';
import { SharedContractView } from '@/components/loan-system/SharedContractView';

// A shared contract is private-by-link: never index it, never let it surface in
// a preview snippet.
export const metadata: Metadata = {
  title: 'Contrato compartilhado',
  robots: { index: false, follow: false, nocache: true },
};

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <SharedContractView token={token} />;
}
