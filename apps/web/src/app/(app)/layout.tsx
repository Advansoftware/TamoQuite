'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Zap } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { BottomNav } from '@/components/loan-system/Navigation';
import { ServiceWorkerRegister } from '@/components/loan-system/ServiceWorkerRegister';
import { SupportButton } from '@/components/loan-system/SupportButton';
import { PwaInstallPrompt } from '@/components/loan-system/PwaInstallPrompt';
import { ChangePasswordPage } from '@/components/loan-system/ChangePasswordPage';
import { PremiumBlockPage } from '@/components/loan-system/PremiumBlockPage';
import { FullScreenLoader } from '@/components/loan-system/FullScreenLoader';
import { hasActiveSubscription } from '@/lib/helpers';

const NAV = [
  { href: '/dashboard', label: 'Painel' },
  { href: '/borrowers', label: 'Pessoas' },
  { href: '/loans', label: 'Empréstimos' },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, isAuthenticated } = useAppStore();

  // Redirect unauthenticated users back to the public entry.
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated || !user) {
    return <FullScreenLoader />;
  }

  // Subscription / password gates.
  if (user.role === 'CLIENT' && !hasActiveSubscription(user.subscriptionStatus)) {
    return (
      <>
        <PremiumBlockPage />
        <PwaInstallPrompt />
        <SupportButton />
      </>
    );
  }
  if (user.mustChangePassword) {
    return (
      <>
        <ChangePasswordPage />
        <PwaInstallPrompt />
        <SupportButton />
      </>
    );
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');
  const showBack =
    /^\/loans\/[^/]+$/.test(pathname) ||
    /^\/borrowers\/[^/]+$/.test(pathname) ||
    /^\/admin\/users\/[^/]+$/.test(pathname);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <ServiceWorkerRegister />

      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-5xl mx-auto flex items-center justify-between h-14 px-4 w-full">
          <div className="flex items-center gap-2.5">
            {showBack && (
              <button
                onClick={() => router.back()}
                className="flex items-center justify-center w-9 h-9 rounded-xl bg-secondary hover:bg-surface-elevated transition-colors -ml-1.5 mr-1"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-neon flex items-center justify-center shadow-[0_0_12px_rgba(0,255,163,0.3)]">
                <Zap className="w-4 h-4 text-background" />
              </div>
              <span className="text-base font-bold text-foreground tracking-tight">TamoQuite</span>
            </Link>

            <nav className="hidden md:flex items-center gap-6 ml-8">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-sm font-medium transition-colors cursor-pointer ${
                    isActive(item.href) ? 'text-neon font-semibold' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              {user.role === 'ADMIN' && (
                <Link
                  href="/admin"
                  className={`text-sm font-medium transition-colors cursor-pointer ${
                    isActive('/admin') ? 'text-neon font-semibold' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Admin
                </Link>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground truncate max-w-[140px] hidden sm:inline">
              {user.name}
            </span>
            <button
              onClick={() => window.dispatchEvent(new Event('open-settings-dialog'))}
              className="hidden md:flex w-8 h-8 rounded-full bg-neon-dim border border-neon/20 items-center justify-center text-neon text-xs font-bold hover:bg-neon/20 transition-all cursor-pointer"
            >
              {user.name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() || 'U'}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 pt-4 pb-24 md:px-6">
        {children}
      </main>

      <BottomNav />
      <SupportButton />
    </div>
  );
}
