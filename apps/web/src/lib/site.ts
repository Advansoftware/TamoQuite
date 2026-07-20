// Central site metadata used across SEO surfaces (layout metadata, sitemap,
// robots, OpenGraph image). The canonical URL is read from the server env so it
// can be set in Coolify without a rebuild; falls back to the production domain.

export const SITE_NAME = 'TamoQuite';

export const SITE_TITLE = 'TamoQuite — Gestão de Repasses e Cobranças por WhatsApp';

export const SITE_DESCRIPTION =
  'Controle empréstimos, repasses e parcelas em um só lugar e automatize cobranças no WhatsApp. ' +
  'Lembretes automáticos no vencimento, gestão de devedores e finanças pessoais descomplicadas.';

export const SITE_KEYWORDS = [
  'gestão de empréstimos',
  'cobrança automática',
  'cobrança por WhatsApp',
  'controle de repasses',
  'gestão de parcelas',
  'lembrete de vencimento',
  'controle de devedores',
  'finanças pessoais',
  'empréstimo entre pessoas',
  'TamoQuite',
];

export const SITE_LOCALE = 'pt_BR';

/** Canonical origin, no trailing slash. */
export function getSiteUrl(): string {
  const raw =
    process.env.SITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.WEB_URL ||
    'https://tamoquite.app';
  return raw.replace(/\/$/, '');
}
