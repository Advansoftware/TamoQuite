import { Zap } from 'lucide-react';

export function FullScreenLoader() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="w-12 h-12 rounded-2xl bg-neon flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(0,255,163,0.3)] animate-pulse">
        <Zap className="w-6 h-6 text-background" />
      </div>
      <div className="w-6 h-6 border-2 border-neon/30 border-t-neon rounded-full animate-spin" />
    </div>
  );
}
