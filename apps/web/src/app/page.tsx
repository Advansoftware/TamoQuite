'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { LandingPage } from '@/components/loan-system/LandingPage';
import { LoginPage } from '@/components/loan-system/LoginPage';
import { PwaInstallPrompt } from '@/components/loan-system/PwaInstallPrompt';
import { SupportButton } from '@/components/loan-system/SupportButton';
import { FullScreenLoader } from '@/components/loan-system/FullScreenLoader';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';

export default function Home() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated, setUser } = useAppStore();
  const [showLogin, setShowLogin] = useState(false);

  // Handle redirect back from Stripe checkout success (?session_id=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    if (!sessionId) return;

    let attempts = 0;
    const maxAttempts = 10;
    const poll = async () => {
      attempts++;
      try {
        const res = await apiFetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.subscriptionStatus === 'active' || attempts >= maxAttempts) {
            setUser(data);
            toast.success('Assinatura ativada com sucesso! Bem-vindo.');
            window.history.replaceState({}, document.title, window.location.pathname);
            return;
          }
        }
      } catch (err) {
        console.error(err);
      }
      if (attempts < maxAttempts) setTimeout(poll, 1500);
    };
    poll();
  }, [setUser]);

  // Once authenticated, hand off to the app (subscription/password gates live in the app layout).
  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      router.replace('/dashboard');
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading || (isAuthenticated && user)) {
    return <FullScreenLoader />;
  }

  return (
    <>
      {showLogin ? (
        <LoginPage onBackToLanding={() => setShowLogin(false)} />
      ) : (
        <LandingPage onEnterApp={() => setShowLogin(true)} />
      )}
      <PwaInstallPrompt />
      <SupportButton />
    </>
  );
}
