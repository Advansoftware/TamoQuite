'use client';

import { useAppStore } from '@/lib/store';
import {
  LayoutDashboard,
  Users,
  FileText,
} from 'lucide-react';

const tabs = [
  { id: 'dashboard' as const, label: 'Painel', icon: LayoutDashboard },
  { id: 'borrowers' as const, label: 'Pessoas', icon: Users },
  { id: 'loans' as const, label: 'Empréstimos', icon: FileText },
];

export function BottomNav() {
  const { currentView, setView, goBack } = useAppStore();
  const showNav = ['dashboard', 'borrowers', 'loans'].includes(currentView);

  if (!showNav) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-surface-elevated/95 backdrop-blur-xl border-t border-border safe-area-bottom">
      <div className="max-w-lg mx-auto flex items-center justify-around h-16 px-4">
        {tabs.map((tab) => {
          const isActive = currentView === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => tab.id === currentView ? null : setView(tab.id)}
              className={`flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-all duration-200 min-w-[72px] ${
                isActive
                  ? 'text-neon'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className={`w-5 h-5 transition-all duration-200 ${isActive ? 'drop-shadow-[0_0_8px_rgba(0,255,163,0.5)]' : ''}`} />
              <span className="text-[10px] font-medium">{tab.label}</span>
              {isActive && (
                <div className="absolute -top-px left-1/2 -translate-x-1/2 w-8 h-0.5 bg-neon rounded-full shadow-[0_0_10px_rgba(0,255,163,0.5)]" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export function TopBar({ title, showBack = false }: { title: string; showBack?: boolean }) {
  const { goBack } = useAppStore();

  return (
    <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border">
      <div className="max-w-lg mx-auto flex items-center gap-3 h-14 px-4">
        {showBack && (
          <button
            onClick={goBack}
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-secondary hover:bg-surface-elevated transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
      </div>
    </header>
  );
}