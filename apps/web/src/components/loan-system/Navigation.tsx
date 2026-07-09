'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { apiPost } from '@/lib/api';
import { LayoutDashboard, Users, FileText, Shield, LogOut, KeyRound, Settings } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

const tabs = [
  { href: '/dashboard', label: 'Painel', icon: LayoutDashboard },
  { href: '/borrowers', label: 'Pessoas', icon: Users },
  { href: '/loans', label: 'Empréstimos', icon: FileText },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAppStore();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [changing, setChanging] = useState(false);

  useEffect(() => {
    const handleOpenSettings = () => setSettingsOpen(true);
    window.addEventListener('open-settings-dialog', handleOpenSettings);
    return () => window.removeEventListener('open-settings-dialog', handleOpenSettings);
  }, []);

  const adminTab = user?.role === 'ADMIN' ? { href: '/admin', label: 'Admin', icon: Shield } : null;

  const allTabs = adminTab ? [...tabs, adminTab] : tabs;

  const handleChangePassword = async () => {
    if (newPwd !== confirmPwd) { toast.error('Senhas não coincidem'); return; }
    if (newPwd.length < 6) { toast.error('Mínimo 6 caracteres'); return; }
    setChanging(true);
    try {
      const res = await apiPost('/api/auth/change-password', { currentPassword: currentPwd, newPassword: newPwd });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      toast.success('Senha alterada!');
      setPasswordOpen(false);
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro');
    } finally { setChanging(false); }
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-surface-elevated/95 backdrop-blur-xl border-t border-border md:hidden">
        <div className="max-w-lg mx-auto flex items-center justify-around h-16 px-2">
          {allTabs.map((tab) => {
            const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/');
            const Icon = tab.icon;
            return (
              <button
                key={tab.href}
                onClick={() => (isActive ? null : router.push(tab.href))}
                className={`flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-all duration-200 min-w-[60px] ${
                  isActive ? 'text-neon' : 'text-muted-foreground hover:text-foreground'
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
          <button
            onClick={() => setSettingsOpen(true)}
            className="flex flex-col items-center gap-1 py-2 px-3 rounded-xl text-muted-foreground hover:text-foreground transition-all min-w-[60px]"
          >
            <div className="w-7 h-7 rounded-full bg-neon-dim flex items-center justify-center">
              <span className="text-neon text-[10px] font-bold">
                {user?.name?.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() || 'U'}
              </span>
            </div>
            <span className="text-[10px] font-medium">Perfil</span>
          </button>
        </div>
      </nav>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="bg-surface border-border text-foreground sm:max-w-sm sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Meu Perfil</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-neon-dim flex items-center justify-center">
                <span className="text-neon font-bold text-sm">
                  {user?.name?.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{user?.name}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium mt-1 inline-block ${
                  user?.role === 'ADMIN' ? 'bg-neon-dim text-neon' : 'bg-surface-elevated text-muted-foreground'
                }`}>
                  {user?.role === 'ADMIN' ? 'Administrador' : 'Cliente'}
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => { setSettingsOpen(false); router.push('/settings'); }}
                className="flex items-center gap-2 px-4 py-3 bg-surface-elevated rounded-xl text-sm text-foreground hover:bg-secondary transition-colors"
              >
                <Settings className="w-4 h-4 text-muted-foreground" />
                Configurações
              </button>
              <button
                onClick={() => { setSettingsOpen(false); setPasswordOpen(true); }}
                className="flex items-center gap-2 px-4 py-3 bg-surface-elevated rounded-xl text-sm text-foreground hover:bg-secondary transition-colors"
              >
                <KeyRound className="w-4 h-4 text-muted-foreground" />
                Alterar Senha
              </button>
              <button
                onClick={() => { setSettingsOpen(false); logout(); }}
                className="flex items-center gap-2 px-4 py-3 bg-danger/10 rounded-xl text-sm text-danger hover:bg-danger/20 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sair
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
        <DialogContent className="bg-surface border-border text-foreground sm:max-w-sm sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Alterar Senha</DialogTitle>
            <DialogDescription className="text-muted-foreground">Sua conta será protegida</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Senha Atual</label>
              <Input type="password" value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)} className="bg-surface-elevated border-border text-foreground rounded-xl h-11" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Nova Senha</label>
              <Input type="password" placeholder="Mínimo 6 caracteres" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} className="bg-surface-elevated border-border text-foreground placeholder:text-muted-foreground rounded-xl h-11" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Confirmar</label>
              <Input type="password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} className="bg-surface-elevated border-border text-foreground rounded-xl h-11" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="secondary" onClick={() => setPasswordOpen(false)} className="bg-surface-elevated text-foreground hover:bg-secondary rounded-xl flex-1">Cancelar</Button>
            <Button onClick={handleChangePassword} disabled={changing || !currentPwd || !newPwd || !confirmPwd} className="bg-neon text-background hover:bg-neon/90 font-semibold rounded-xl flex-1">
              {changing ? '...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}