'use client';

import { useState, useEffect } from 'react';
import { X, Download, Share2, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstall, setShowInstall] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    const installHandler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (!localStorage.getItem('pwa-install-dismissed')) {
        setShowInstall(true);
      }
    };
    window.addEventListener('beforeinstallprompt', installHandler);

    const handleSWUpdate = (registration: ServiceWorkerRegistration) => {
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            newWorker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(handleSWUpdate);
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    }

    const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isMobile && !isStandalone) {
      const timer = setTimeout(() => {
        if (!localStorage.getItem('pwa-install-dismissed')) {
          setShowInstall(true);
        }
      }, 10000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', installHandler);
      };
    }

    return () => window.removeEventListener('beforeinstallprompt', installHandler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowInstall(false);
      }
      setDeferredPrompt(null);
      return;
    }

    // No beforeinstallprompt (iOS Safari) - show instructions
    setShowInstructions(true);
    setShowInstall(false);
  };

  const handleDismiss = () => {
    setShowInstall(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  const isIos = /iPhone|iPad|iPod/i.test(
    typeof navigator !== 'undefined' ? navigator.userAgent : ''
  );

  return (
    <>
      {/* Install banner */}
      {showInstall && (
        <div className="fixed bottom-20 left-4 right-4 z-50 md:bottom-6 md:left-auto md:right-6 md:w-80 animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="bg-surface border border-border/80 rounded-2xl p-4 shadow-[0_10px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-neon/10 border border-neon/20 flex items-center justify-center flex-shrink-0">
                <Download className="w-5 h-5 text-neon" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">Instalar TamoQuite</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Instale em seu celular para acessar mais rápido como um app.
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={handleInstall}
                    className="px-4 py-1.5 bg-neon text-background text-xs font-bold rounded-lg hover:bg-neon/90 transition-all active:scale-[0.98] cursor-pointer"
                  >
                    Instalar
                  </button>
                  <button
                    onClick={handleDismiss}
                    className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    Agora não
                  </button>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Instructions modal (iOS fallback) */}
      {showInstructions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
          <div className="relative w-full max-w-sm bg-surface border border-border/80 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] overflow-hidden p-6">
            <button
              onClick={() => setShowInstructions(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-secondary hover:bg-surface-elevated text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-neon/10 border border-neon/20 flex items-center justify-center mx-auto mb-4">
                <Smartphone className="w-8 h-8 text-neon" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Instalar TamoQuite</h3>
              <p className="text-xs text-muted-foreground mb-6">
                Siga os passos abaixo para instalar o app no seu celular:
              </p>
            </div>

            {isIos ? (
              <div className="space-y-4">
                <Step number={1} icon={<Share2 className="w-4 h-4" />} text="Toque no ícone Compartilhar" />
                <Step number={2} icon={<Download className="w-4 h-4" />} text="Role para baixo e toque em Adicionar à Tela de Início" />
                <Step number={3} icon={<Smartphone className="w-4 h-4" />} text="Toque em Adicionar no canto superior direito" />
              </div>
            ) : (
              <div className="space-y-4">
                <Step number={1} icon={<Download className="w-4 h-4" />} text="Abra o menu do navegador (3 pontinhos)" />
                <Step number={2} icon={<Download className="w-4 h-4" />} text="Selecione Instalar aplicativo ou Adicionar à tela inicial" />
                <Step number={3} icon={<Smartphone className="w-4 h-4" />} text="Confirme a instalação" />
              </div>
            )}

            <button
              onClick={() => setShowInstructions(false)}
              className="w-full h-11 bg-neon text-background font-bold rounded-xl mt-6 text-sm cursor-pointer hover:bg-neon/90 transition-all"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function Step({ number, icon, text }: { number: number; icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/40 border border-border/60">
      <div className="w-8 h-8 rounded-full bg-neon/10 border border-neon/20 flex items-center justify-center text-neon text-xs font-bold flex-shrink-0">
        {number}
      </div>
      <div className="flex items-center gap-2 text-sm text-foreground">
        <span className="text-neon flex-shrink-0">{icon}</span>
        <span>{text}</span>
      </div>
    </div>
  );
}
