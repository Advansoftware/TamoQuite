import Link from 'next/link';
import { ArrowLeft, Zap, Trash2 } from 'lucide-react';

import type { Metadata } from 'next';

/**
 * Public account-deletion page.
 *
 * Required by the Google Play data-safety rules, which expect a URL that is
 * reachable WITHOUT logging in and that states three things: the app/developer
 * name, the steps to request deletion, and exactly what is erased versus kept
 * (plus any extra retention period). All three are spelled out below.
 *
 * The retention window here must stay in sync with ACCOUNT_RETENTION_DAYS in the
 * API — this page is the promise, that constant is the enforcement.
 */
export const metadata: Metadata = {
  title: 'Excluir sua conta',
  description:
    'Como solicitar a exclusão da sua conta TamoQuite e dos seus dados: passo a passo, o que é apagado, o que é mantido e por quanto tempo.',
  alternates: { canonical: '/excluir-conta' },
  openGraph: {
    title: 'Excluir sua conta · TamoQuite',
    description: 'Passo a passo para excluir sua conta TamoQuite e seus dados.',
    url: '/excluir-conta',
    type: 'article',
  },
};

const UPDATED_AT = '19 de julho de 2026';
const RETENTION_DAYS = 90;

export default function DeleteAccountPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-2xl px-6 py-10">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao início
        </Link>

        <header className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-neon shadow-[0_0_24px_rgba(0,255,163,0.25)]">
            <Zap className="h-5 w-5 text-background" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Excluir sua conta</h1>
            <p className="text-sm text-muted-foreground">Última atualização: {UPDATED_AT}</p>
          </div>
        </header>

        <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">
          <section className="space-y-2">
            <p>
              Esta página explica como solicitar a exclusão da sua conta no{' '}
              <strong className="text-foreground">TamoQuite</strong> e o que acontece com os seus dados.
              O aplicativo e a plataforma são desenvolvidos e mantidos por{' '}
              <strong className="text-foreground">TamoQuite</strong>.
            </p>
          </section>

          <Section title="Como excluir sua conta">
            <p>Você mesmo faz isso pelo aplicativo, em menos de um minuto:</p>
            <ol className="list-decimal space-y-2 pl-5">
              <li>Entre na sua conta do TamoQuite.</li>
              <li>
                Toque em <strong className="text-foreground">Configurações</strong> no menu.
              </li>
              <li>
                Vá até o fim da página, na seção{' '}
                <strong className="text-foreground">Zona de risco</strong>.
              </li>
              <li>
                Toque em <strong className="text-foreground">Excluir minha conta</strong>.
              </li>
              <li>Confirme com a sua senha. Pronto — a conta é encerrada na hora.</li>
            </ol>
            <p className="pt-2">
              Não consegue acessar sua conta? Escreva para{' '}
              <a href="mailto:suporte@tamoquite.com" className="text-neon hover:underline">
                suporte@tamoquite.com
              </a>{' '}
              do e-mail cadastrado, com o assunto &quot;Excluir minha conta&quot;. Confirmamos sua
              identidade e concluímos a exclusão em até 7 dias úteis.
            </p>
          </Section>

          <Section title="O que acontece imediatamente">
            <ul className="list-disc space-y-2 pl-5">
              <li>Seu acesso é encerrado e não é mais possível entrar na conta.</li>
              <li>
                A cobrança da assinatura é cancelada. Você não é cobrado novamente a partir da
                exclusão.
              </li>
              <li>
                Todas as cobranças automáticas param. Nenhuma mensagem é enviada aos seus contatos.
              </li>
              <li>Os links públicos de contrato que você compartilhou deixam de funcionar.</li>
            </ul>
          </Section>

          <Section title="Quais dados são excluídos">
            <p>
              Passados <strong className="text-foreground">{RETENTION_DAYS} dias</strong> da
              solicitação, todos os dados abaixo são apagados em definitivo dos nossos servidores,
              sem possibilidade de recuperação:
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong className="text-foreground">Dados da conta:</strong> nome, e-mail e senha.
              </li>
              <li>
                <strong className="text-foreground">Contatos cadastrados:</strong> nomes, números de
                WhatsApp e anotações dos seus devedores.
              </li>
              <li>
                <strong className="text-foreground">Contratos e parcelas:</strong> empréstimos,
                valores, vencimentos, pagamentos e todo o histórico financeiro.
              </li>
              <li>
                <strong className="text-foreground">Cobranças:</strong> mensagens enviadas, histórico
                de envios e status de entrega.
              </li>
              <li>
                <strong className="text-foreground">Configurações:</strong> preferências de cobrança,
                modelos de mensagem e a conexão do seu WhatsApp.
              </li>
            </ul>
          </Section>

          <Section title={`Por que guardamos por ${RETENTION_DAYS} dias`}>
            <p>
              Sua conta é desativada na hora, mas os registros ficam guardados e inacessíveis por{' '}
              <strong className="text-foreground">{RETENTION_DAYS} dias</strong> antes de serem
              apagados. Esse prazo existe por dois motivos: permitir que você recupere a conta caso
              tenha excluído por engano (basta escrever para o suporte dentro do prazo) e atender a
              eventuais contestações de pagamento ou obrigações legais. Durante esse período os dados
              não são usados para nada — nenhuma cobrança é enviada e nada aparece na plataforma.
            </p>
          </Section>

          <Section title="O que é mantido depois disso">
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong className="text-foreground">Registros fiscais de pagamento:</strong> notas e
                comprovantes das assinaturas que você pagou são mantidos pelo prazo exigido pela
                legislação brasileira (5 anos), por obrigação legal. Eles ficam com nosso processador
                de pagamentos e contêm apenas dados da transação, não os seus contratos ou contatos.
              </li>
              <li>
                <strong className="text-foreground">Dados anonimizados:</strong> estatísticas de uso
                que não identificam você nem ninguém podem ser mantidas para melhorar o produto.
              </li>
            </ul>
          </Section>

          <Section title="Dúvidas">
            <p>
              Qualquer dúvida sobre a exclusão ou sobre seus dados, fale com a gente em{' '}
              <a href="mailto:suporte@tamoquite.com" className="text-neon hover:underline">
                suporte@tamoquite.com
              </a>
              . Veja também nossa{' '}
              <Link href="/privacidade" className="text-neon hover:underline">
                Política de Privacidade
              </Link>
              .
            </p>
          </Section>

          <div className="rounded-xl border border-danger/20 bg-danger/5 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-danger">
              <Trash2 className="h-4 w-4" />
              A exclusão é definitiva
            </p>
            <p className="mt-1 text-xs">
              Depois dos {RETENTION_DAYS} dias não há como recuperar seus contratos, contatos ou
              histórico. Se quiser guardar alguma informação, anote antes de excluir.
            </p>
          </div>
        </div>

        <footer className="mt-12 border-t border-border pt-6 text-center text-xs text-muted-foreground/60">
          TamoQuite · Cobranças &amp; Repasses Inteligentes
        </footer>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  );
}
