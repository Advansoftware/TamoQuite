export const DEFAULT_REMINDER_TEMPLATE =
  'Oi {{nome}}! 👋 Passando pra lembrar que sua parcela {{parcela}} de {{valor}} vence dia {{vencimento}}. Qualquer dúvida é só chamar! 🤝';

export const DEFAULT_DUE_TEMPLATE =
  'Olá {{nome}}! 💰 Sua parcela {{parcela}} de {{valor}} vence hoje ({{vencimento}}). Assim que puder, é só realizar o pagamento. Obrigado! 🙏';

export const DEFAULT_OVERDUE_TEMPLATE =
  'Oi {{nome}}, tudo bem? A parcela {{parcela}} de {{valor}} venceu em {{vencimento}} e ainda consta em aberto. Consegue acertar? Qualquer coisa me avisa. 🤝';

export function renderTemplate(
  template: string,
  vars: { nome: string; valor: number; vencimento: Date; parcela: number; total: number },
): string {
  const currency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  const date = (d: Date) =>
    new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);

  return template
    .replace(/\{\{\s*nome\s*\}\}/g, vars.nome)
    .replace(/\{\{\s*valor\s*\}\}/g, currency(vars.valor))
    .replace(/\{\{\s*vencimento\s*\}\}/g, date(vars.vencimento))
    .replace(/\{\{\s*parcela\s*\}\}/g, String(vars.parcela))
    .replace(/\{\{\s*total\s*\}\}/g, currency(vars.total));
}
