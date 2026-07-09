import { ImageResponse } from 'next/og';
import { SITE_NAME } from '@/lib/site';

export const alt = 'TamoQuite — Gestão de Repasses e Cobranças por WhatsApp';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Statically generated OG/Twitter card image (no external assets).
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          background: 'radial-gradient(circle at 22% 18%, #0f2a24 0%, #080C12 55%)',
          padding: '80px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: 24,
              background: '#00FFA3',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 56,
              color: '#080C12',
              fontWeight: 800,
            }}
          >
            ⚡
          </div>
          <div style={{ color: '#F1F5F9', fontSize: 56, fontWeight: 800, letterSpacing: '-1px' }}>
            {SITE_NAME}
          </div>
        </div>

        <div
          style={{
            color: '#F1F5F9',
            fontSize: 68,
            fontWeight: 800,
            lineHeight: 1.1,
            marginTop: 56,
            maxWidth: 900,
            letterSpacing: '-2px',
          }}
        >
          Gestão de repasses e cobranças automáticas no WhatsApp
        </div>

        <div style={{ color: '#94A3B8', fontSize: 32, marginTop: 32, maxWidth: 860 }}>
          Controle empréstimos, parcelas e devedores — e deixe os lembretes de vencimento no automático.
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: 64,
            right: 80,
            color: '#00FFA3',
            fontSize: 28,
            fontWeight: 600,
          }}
        >
          tamoquite.com.br
        </div>
      </div>
    ),
    { ...size },
  );
}
