export const DEFAULT_REMINDER_TEMPLATE =
  'Oi {{nome}}! 👋 Passando pra lembrar que sua parcela {{parcela}} de {{valor}} vence dia {{vencimento}}. Qualquer dúvida é só chamar! 🤝';

export const DEFAULT_DUE_TEMPLATE =
  'Olá {{nome}}! 💰 Sua parcela {{parcela}} de {{valor}} vence hoje ({{vencimento}}). Assim que puder, é só realizar o pagamento. Obrigado! 🙏';

export const DEFAULT_OVERDUE_TEMPLATE =
  'Oi {{nome}}, tudo bem? A parcela {{parcela}} de {{valor}} venceu em {{vencimento}} e ainda consta em aberto. Consegue acertar? Qualquer coisa me avisa. 🤝';

// Global-mode defaults: the number is shared, so the message MUST name the creditor.
export const DEFAULT_GLOBAL_REMINDER_TEMPLATE =
  'Olá {{nome}}! Cobrança automática em nome de {{credor}}. Sua parcela {{parcela}} de {{valor}} vence dia {{vencimento}}. Dúvidas? Fale com {{credor}}: {{telefone_credor}}.';

export const DEFAULT_GLOBAL_DUE_TEMPLATE =
  'Olá {{nome}}! Cobrança automática em nome de {{credor}}. Sua parcela {{parcela}} de {{valor}} vence hoje ({{vencimento}}). Dúvidas? Fale com {{credor}}: {{telefone_credor}}.';

export const DEFAULT_GLOBAL_OVERDUE_TEMPLATE =
  'Olá {{nome}}. Cobrança automática em nome de {{credor}}: a parcela {{parcela}} de {{valor}} venceu em {{vencimento}} e consta em aberto. Fale com {{credor}}: {{telefone_credor}}.';

/** Auto-reply sent from a global pool number when a debtor replies to it. */
export const AUTOREPLY_TEMPLATE =
  'Olá! Esta é uma central automática de cobranças em nome de {{credor}}. Para tratar sobre este assunto, fale diretamente com {{credor}}: {{telefone_credor}}.';

export const CREDITOR_PLACEHOLDER = '{{credor}}';

export interface TemplateVars {
  nome: string;
  valor: number;
  vencimento: Date;
  parcela: number;
  total: number;
  credor: string;
  telefone_credor: string;
}

export function renderTemplate(template: string, vars: TemplateVars): string {
  const currency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  const date = (d: Date) =>
    new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);

  return template
    .replace(/\{\{\s*nome\s*\}\}/g, vars.nome)
    .replace(/\{\{\s*valor\s*\}\}/g, currency(vars.valor))
    .replace(/\{\{\s*vencimento\s*\}\}/g, date(vars.vencimento))
    .replace(/\{\{\s*parcela\s*\}\}/g, String(vars.parcela))
    .replace(/\{\{\s*total\s*\}\}/g, currency(vars.total))
    .replace(/\{\{\s*credor\s*\}\}/g, vars.credor)
    .replace(/\{\{\s*telefone_credor\s*\}\}/g, vars.telefone_credor || 'contato não informado');
}

/** True if the template references the creditor — required in GLOBAL mode. */
export function hasCreditorPlaceholder(template: string): boolean {
  return /\{\{\s*credor\s*\}\}/.test(template);
}
