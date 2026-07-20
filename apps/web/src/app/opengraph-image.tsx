import { ImageResponse } from 'next/og';
import { SITE_NAME, getSiteUrl } from '@/lib/site';

export const alt =
  'TamoQuite — Emprestou dinheiro? Cobre sem chatice, direto no WhatsApp.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Statically generated social banner (1200×630, no external assets), styled like
// a Play Store feature graphic: brand message on the left, a large neon
// "sign" (rounded frame + lightning bolt) on the right echoing the real app icon.
export default function OpengraphImage() {
  const domain = getSiteUrl().replace(/^https?:\/\//, '');

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          background:
            'radial-gradient(900px 900px at 88% 50%, rgba(0,255,163,0.20) 0%, rgba(8,12,18,0) 58%), radial-gradient(700px 600px at 4% 110%, rgba(0,255,163,0.08) 0%, rgba(8,12,18,0) 55%), #080C12',
          padding: '0 80px',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* accent hairline */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: 'linear-gradient(90deg, #00FFA3 0%, #25D366 100%)',
          }}
        />

        {/* LEFT — brand message */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            paddingRight: 48,
          }}
        >
          <div
            style={{
              display: 'flex',
              color: '#F1F5F9',
              fontSize: 40,
              fontWeight: 800,
              letterSpacing: '-1px',
              marginBottom: 34,
            }}
          >
            {SITE_NAME}
          </div>

          <div
            style={{
              color: '#F1F5F9',
              fontSize: 66,
              fontWeight: 800,
              lineHeight: 1.08,
              letterSpacing: '-2.5px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <span style={{ display: 'flex' }}>Emprestou dinheiro?</span>
            <span style={{ display: 'flex' }}>Cobre sem chatice,</span>
            <span style={{ display: 'flex' }}>
              no<span style={{ color: '#00FFA3' }}>&nbsp;WhatsApp</span>
            </span>
          </div>

          <div
            style={{
              color: '#94A3B8',
              fontSize: 27,
              marginTop: 26,
              maxWidth: 620,
              lineHeight: 1.35,
              display: 'flex',
            }}
          >
            Controle empréstimos, repasses e parcelas — e deixe os lembretes de
            vencimento no automático.
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 40 }}>
            {/* Price highlight */}
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 10,
                padding: '14px 26px',
                borderRadius: 18,
                background: 'rgba(0,255,163,0.12)',
                border: '1px solid rgba(0,255,163,0.45)',
              }}
            >
              <span style={{ display: 'flex', color: '#00FFA3', fontSize: 40, fontWeight: 800, letterSpacing: '-1px' }}>
                R$ 14,90
              </span>
              <span style={{ display: 'flex', color: '#94A3B8', fontSize: 24, fontWeight: 600 }}>
                /mês
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                padding: '11px 20px',
                borderRadius: 999,
                background: 'rgba(37,211,102,0.14)',
                border: '1px solid rgba(37,211,102,0.45)',
                color: '#25D366',
                fontSize: 22,
                fontWeight: 600,
              }}
            >
              7 dias grátis
            </div>
          </div>
        </div>

        {/* RIGHT — neon "sign" hero (echoes the app icon) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 340,
            height: 400,
            borderRadius: 44,
            border: '7px solid #00FFA3',
            background:
              'radial-gradient(circle at 50% 40%, rgba(0,255,163,0.16) 0%, rgba(8,12,18,0) 70%)',
            boxShadow:
              '0 0 90px rgba(0,255,163,0.55), inset 0 0 55px rgba(0,255,163,0.22)',
          }}
        >
          <svg width="200" height="240" viewBox="0 0 24 24">
            <path
              d="M13 2 4 13h5l-1 9 8-12h-5l3-8z"
              fill="rgba(0,255,163,0.12)"
              stroke="#00FFA3"
              strokeWidth="1.4"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* domain */}
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            right: 80,
            display: 'flex',
            color: '#F1F5F9',
            fontSize: 26,
            fontWeight: 600,
          }}
        >
          {domain}
        </div>
      </div>
    ),
    { ...size },
  );
}
