import { ResetPasswordForm } from '@/components/loan-system/ResetPasswordForm';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Redefinir senha',
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return <ResetPasswordForm token={token || ''} />;
}
