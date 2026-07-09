import Link from 'next/link';
import { ArrowLeft, Zap } from 'lucide-react';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Política de Privacidade',
  description: 'Como o TamoQuite coleta, usa e protege os seus dados. Transparência sobre dados, cookies e seus direitos pela LGPD.',
  alternates: { canonical: '/privacidade' },
  openGraph: {
    title: 'Política de Privacidade · TamoQuite',
    description: 'Como o TamoQuite coleta, usa e protege os seus dados.',
    url: '/privacidade',
    type: 'article',
  },
};

const UPDATED_AT = '9 de julho de 2026';

export default function PrivacyPolicyPage() {
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
            <h1 className="text-2xl font-bold tracking-tight">Política de Privacidade</h1>
            <p className="text-sm text-muted-foreground">Última atualização: {UPDATED_AT}</p>
          </div>
        </header>

        <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">
          <section className="space-y-2">
            <p>
              Esta Política de Privacidade descreve como o <strong className="text-foreground">TamoQuite</strong>{' '}
              (&quot;nós&quot;) coleta, utiliza, armazena e protege as suas informações ao usar nossa plataforma de
              gestão de repasses de empréstimos e cobranças. Ao utilizar o serviço, você concorda com as práticas
              descritas aqui.
            </p>
          </section>

          <Section title="1. Dados que coletamos">
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong className="text-foreground">Dados de conta:</strong> nome, e-mail e senha (armazenada de forma
                criptografada). Necessários para autenticar e proteger seu acesso.
              </li>
              <li>
                <strong className="text-foreground">Dados de contatos e contratos:</strong> nomes, números de WhatsApp e
                informações de empréstimos/parcelas que você cadastra para gerenciar suas cobranças.
              </li>
              <li>
                <strong className="text-foreground">Dados de conexão do WhatsApp:</strong> ao conectar seu número, o
                status da instância e o número conectado, usados exclusivamente para enviar as cobranças que você
                configurar.
              </li>
              <li>
                <strong className="text-foreground">Dados de pagamento:</strong> a assinatura é processada pela Stripe.
                Não armazenamos os dados do seu cartão — apenas identificadores da assinatura.
              </li>
              <li>
                <strong className="text-foreground">Dados técnicos:</strong> informações básicas de uso e registros
                necessários para o funcionamento e a segurança do sistema.
              </li>
            </ul>
          </Section>

          <Section title="2. Como usamos os dados">
            <ul className="list-disc space-y-2 pl-5">
              <li>Operar a plataforma, autenticar seu acesso e exibir seus contratos e cobranças.</li>
              <li>
                Enviar mensagens automáticas de lembrete e cobrança pelo WhatsApp, conforme as regras que você definir
                (você pode desativar a cobrança de um contrato ou parcela a qualquer momento).
              </li>
              <li>Processar a assinatura e o faturamento.</li>
              <li>Enviar e-mails transacionais, como redefinição de senha.</li>
              <li>Garantir a segurança, prevenir fraudes e cumprir obrigações legais.</li>
            </ul>
          </Section>

          <Section title="3. Compartilhamento com terceiros">
            <p>Compartilhamos dados apenas com provedores essenciais à operação:</p>
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>
                <strong className="text-foreground">Stripe</strong> — processamento de pagamentos e assinaturas.
              </li>
              <li>
                <strong className="text-foreground">Provedor da API de WhatsApp</strong> — envio das mensagens de
                cobrança a partir do seu número conectado.
              </li>
              <li>
                <strong className="text-foreground">Provedor de e-mail</strong> — envio de e-mails transacionais.
              </li>
            </ul>
            <p className="mt-2">
              Não vendemos nem alugamos seus dados. O compartilhamento se limita ao necessário para prestar o serviço ou
              cumprir a lei.
            </p>
          </Section>

          <Section title="4. Armazenamento e segurança">
            <p>
              As senhas são armazenadas com hash criptográfico e nunca em texto puro. Adotamos medidas técnicas e
              organizacionais para proteger seus dados contra acesso não autorizado, perda ou alteração. Ainda assim,
              nenhum sistema é 100% seguro, e não podemos garantir segurança absoluta.
            </p>
          </Section>

          <Section title="5. Retenção">
            <p>
              Mantemos seus dados enquanto sua conta estiver ativa ou conforme necessário para prestar o serviço. Você
              pode solicitar a exclusão da sua conta e dos dados associados, ressalvadas as informações que precisamos
              reter por obrigação legal.
            </p>
          </Section>

          <Section title="6. Seus direitos (LGPD)">
            <p>
              Conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você pode solicitar acesso, correção,
              portabilidade, anonimização ou exclusão dos seus dados, além de revogar consentimentos. Para exercer esses
              direitos, entre em contato conosco pelo e-mail abaixo.
            </p>
          </Section>

          <Section title="7. Responsabilidade sobre dados de terceiros">
            <p>
              Ao cadastrar contatos (devedores) e enviar cobranças, você declara ter base legal para tratar esses dados
              e é o controlador dessas informações. O TamoQuite atua como operador, processando os dados conforme suas
              instruções.
            </p>
          </Section>

          <Section title="8. Alterações nesta política">
            <p>
              Podemos atualizar esta Política periodicamente. Alterações relevantes serão comunicadas na plataforma. A
              data da última atualização consta no topo desta página.
            </p>
          </Section>

          <Section title="9. Contato">
            <p>
              Dúvidas sobre esta Política ou sobre seus dados? Fale conosco em{' '}
              <a href="mailto:suporte@tamoquite.com" className="text-neon hover:underline">
                suporte@tamoquite.com
              </a>
              .
            </p>
          </Section>
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
