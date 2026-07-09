export function buildPasswordResetEmail(
  name: string,
  link: string,
): { subject: string; html: string; text: string } {
  const subject = 'Redefinição de senha — TamoQuite';

  const text = [
    `Olá ${name},`,
    '',
    'Recebemos um pedido para redefinir a senha da sua conta no TamoQuite.',
    'Acesse o link abaixo para criar uma nova senha (válido por 1 hora):',
    '',
    link,
    '',
    'Se você não solicitou isso, ignore este email — sua senha permanece a mesma.',
    '',
    'Equipe TamoQuite',
  ].join('\n');

  const html = `
  <div style="background:#0B0F17;padding:32px 16px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:480px;margin:0 auto;background:#111827;border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden;">
      <div style="padding:28px 28px 8px;">
        <div style="display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:12px;background:#00FFA3;color:#0B0F17;font-weight:800;font-size:20px;">⚡</div>
        <h1 style="color:#F1F5F9;font-size:20px;margin:16px 0 4px;">Redefinição de senha</h1>
        <p style="color:#94A3B8;font-size:14px;margin:0;">Olá ${escapeHtml(name)},</p>
      </div>
      <div style="padding:8px 28px 28px;">
        <p style="color:#CBD5E1;font-size:14px;line-height:1.6;">
          Recebemos um pedido para redefinir a senha da sua conta. Clique no botão abaixo para criar uma nova senha.
          O link é válido por <strong style="color:#F1F5F9;">1 hora</strong>.
        </p>
        <a href="${link}" style="display:inline-block;margin:12px 0 20px;padding:12px 24px;background:#00FFA3;color:#0B0F17;text-decoration:none;font-weight:700;font-size:14px;border-radius:12px;">
          Redefinir minha senha
        </a>
        <p style="color:#64748B;font-size:12px;line-height:1.6;margin:0;">
          Se o botão não funcionar, copie e cole este endereço no navegador:<br/>
          <a href="${link}" style="color:#00FFA3;word-break:break-all;">${link}</a>
        </p>
        <hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:20px 0;" />
        <p style="color:#64748B;font-size:12px;line-height:1.6;margin:0;">
          Se você não solicitou a redefinição, ignore este email — sua senha permanece a mesma.
        </p>
      </div>
    </div>
    <p style="text-align:center;color:#475569;font-size:11px;margin:20px 0 0;">TamoQuite · Cobranças &amp; Repasses Inteligentes</p>
  </div>`;

  return { subject, html, text };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
