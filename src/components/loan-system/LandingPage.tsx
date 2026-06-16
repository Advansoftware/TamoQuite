'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { 
  Zap, 
  Check, 
  Users, 
  MessageSquare, 
  Calendar, 
  ArrowRight, 
  ShieldCheck, 
  Percent, 
  TrendingUp,
  ChevronDown,
  X,
  CreditCard,
  QrCode,
  Loader2,
  Lock,
  Mail,
  User,
  Key
} from 'lucide-react';
import { toast } from 'sonner';

interface LandingPageProps {
  onEnterApp: () => void;
}

type CheckoutStep = 'PAYMENT_METHOD' | 'PIX_PAYMENT' | 'CARD_PAYMENT' | 'PROCESSING' | 'CREATE_ACCOUNT' | 'SUCCESS';

export function LandingPage({ onEnterApp }: LandingPageProps) {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>('CREATE_ACCOUNT');
  const [loading, setLoading] = useState(false);
  const { setUser } = useAppStore();

  // Form states for account registration
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const handleOpenCheckout = () => {
    setIsCheckoutOpen(true);
    setCheckoutStep('CREATE_ACCOUNT');
  };

  const handleCloseCheckout = () => {
    setIsCheckoutOpen(false);
    // Reset states
    setRegName('');
    setRegEmail('');
    setRegPassword('');
  };

  const handleStripeCheckout = async () => {
    setLoading(true);
    try {
      const state = useAppStore.getState();
      const token = state.token;
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'Erro ao iniciar checkout');
        setLoading(false);
        return;
      }

      const { url } = await res.json();
      window.location.href = url;
    } catch (err: unknown) {
      console.error(err);
      toast.error('Erro de conexão ao iniciar checkout');
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim() || !regPassword) {
      toast.error('Preencha todos os campos do cadastro');
      return;
    }
    if (regPassword.length < 6) {
      toast.error('A senha deve conter pelo menos 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      // 1. Create account
      const signupRes = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName.trim(),
          email: regEmail.trim().toLowerCase(),
          password: regPassword
        })
      });

      if (!signupRes.ok) {
        const errData = await signupRes.json();
        toast.error(errData.error || 'Erro ao criar conta');
        setLoading(false);
        return;
      }

      // 2. Perform automatic login
      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: regEmail.trim().toLowerCase(),
          password: regPassword
        })
      });

      if (!loginRes.ok) {
        toast.error('Conta criada, mas houve erro no login automático. Acesse pela tela de login.');
        setCheckoutStep('SUCCESS');
        setLoading(false);
        return;
      }

      const loginData = await loginRes.json();

      // Temporarily store token for checkout without triggering full auth state
      useAppStore.getState().setUser(loginData.user, loginData.token);
      setCheckoutStep('PROCESSING');

      const token = loginData.token;
      const checkoutRes = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!checkoutRes.ok) {
        const errData = await checkoutRes.json();
        toast.error(errData.error || 'Erro ao iniciar checkout');
        setLoading(false);
        return;
      }

      const { url } = await checkoutRes.json();
      window.location.href = url;

    } catch (err) {
      console.error(err);
      toast.error('Erro de conexão com o servidor');
      setLoading(false);
    }
  };

  const features = [
    {
      icon: <Users className="w-6 h-6 text-neon" />,
      title: "Gestão Amigável de Devedores",
      description: "Cadastre seus amigos, parentes ou clientes com facilidade. Tenha em mãos o histórico de todos que estão em débito com você."
    },
    {
      icon: <Percent className="w-6 h-6 text-neon" />,
      title: "Cálculo Automático de Juros",
      description: "Defina juros mensais ou taxas fixas. O sistema recalcula o saldo atualizado de forma automática e transparente para ambas as partes."
    },
    {
      icon: <MessageSquare className="w-6 h-6 text-neon" />,
      title: "Cobrança Sem Constrangimento",
      description: "Gere mensagens personalizadas e links diretos para enviar via WhatsApp em 1 clique. Esqueça a vergonha de cobrar pessoalmente."
    },
    {
      icon: <Calendar className="w-6 h-6 text-neon" />,
      title: "Controle de Parcelas & Datas",
      description: "Visualize parcelas em aberto, pagas e atrasadas em um calendário financeiro inteligente. Saiba exatamente quando o dinheiro vai entrar."
    },
    {
      icon: <TrendingUp className="w-6 h-6 text-neon" />,
      title: "Dashboard de Estatísticas",
      description: "Monitore seu saldo pendente, total recebido e métricas de atraso em gráficos limpos e fáceis de ler. Total clareza financeira."
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-neon" />,
      title: "Privacidade Garantida",
      description: "Seus dados e registros de empréstimos são criptografados e protegidos. Apenas você tem acesso às suas informações financeiras."
    }
  ];

  const steps = [
    {
      number: "01",
      title: "Registre o Empréstimo",
      description: "Cadastre quem pegou emprestado, o valor, a data e a forma de pagamento (parcelado ou parcela única)."
    },
    {
      number: "02",
      title: "Defina os Parâmetros",
      description: "Escolha se quer aplicar juros simples, composto ou taxa fixa para atualizar o valor automaticamente com o tempo."
    },
    {
      number: "03",
      title: "Cobre com um Clique",
      description: "Quando a data chegar, use nossos templates prontos de mensagens amigáveis e envie direto para o WhatsApp do devedor."
    }
  ];

  const faqs = [
    {
      question: "Como funciona a cobrança por WhatsApp?",
      answer: "O TamoQuite gera um link oficial de conversa do WhatsApp (`wa.me`) com uma mensagem personalizada e amigável contendo os dados do débito. Você só precisa clicar no botão e enviar, sem precisar digitar nada ou passar por situações embaraçosas."
    },
    {
      question: "O app é seguro para guardar minhas contas?",
      answer: "Sim! Utilizamos conexões criptografadas (HTTPS) e sessões seguras. Seus dados são salvos em nosso banco de dados seguro e nunca são compartilhados com terceiros."
    },
    {
      question: "Posso acessar pelo meu celular?",
      answer: "Com certeza! O TamoQuite foi construído como um PWA (Progressive Web App). Isso significa que você pode instalá-lo diretamente na tela inicial do seu celular (Android ou iPhone) como se fosse um aplicativo da App Store ou Google Play, economizando espaço e acessando mais rápido."
    },
    {
      question: "Como funciona a assinatura de R$ 14,90?",
      answer: "É muito simples. Cobramos uma mensalidade única de R$ 14,90 para liberar todos os recursos de forma ilimitada (cadastros de empréstimos, cobranças, juros e histórico). Não há contratos de fidelidade, você pode cancelar quando quiser através do suporte."
    }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans overflow-x-hidden selection:bg-neon selection:text-background relative">
      
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-neon flex items-center justify-center shadow-[0_0_12px_rgba(0,255,163,0.3)]">
              <Zap className="w-4 h-4 text-background" />
            </div>
            <span className="text-lg font-extrabold tracking-tight text-foreground">TamoQuite</span>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <a href="#funcionalidades" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Funcionalidades</a>
            <a href="#como-funciona" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Como Funciona</a>
            <a href="#precos" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Preço</a>
            <a href="#faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Dúvidas</a>
          </nav>

          <button 
            onClick={onEnterApp}
            className="px-5 py-2 bg-secondary hover:bg-surface-elevated text-foreground hover:text-neon rounded-xl text-sm font-semibold border border-border hover:border-neon/30 transition-all active:scale-[0.98] cursor-pointer"
          >
            Acessar Sistema
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-16 md:pt-32 md:pb-24 flex flex-col items-center text-center px-6 max-w-5xl mx-auto">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] md:w-[600px] md:h-[600px] bg-neon/5 rounded-full blur-[80px] md:blur-[120px] pointer-events-none -z-10" />

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-elevated border border-border mb-6">
          <span className="w-2 h-2 rounded-full bg-neon animate-pulse" />
          <span className="text-xs text-muted-foreground font-medium">Controle financeiro pessoal e repasses simplificados</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground leading-[1.15] mb-6">
          Emprestou dinheiro? <br className="hidden sm:block" />
          Cobre sem chatice com o <span className="text-neon neon-text">TamoQuite</span>.
        </h1>

        <p className="text-base md:text-lg text-muted-foreground max-w-2xl mb-10 leading-relaxed">
          A forma inteligente e amigável de gerenciar empréstimos para amigos, repasses de compras parceladas e cobrar quem te deve direto no WhatsApp com um único clique.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <button 
            onClick={handleOpenCheckout}
            className="w-full sm:w-auto h-13 px-8 bg-neon hover:bg-neon/90 text-background font-bold rounded-xl flex items-center justify-center gap-2 hover:shadow-[0_0_25px_rgba(0,255,163,0.35)] transition-all duration-200 active:scale-[0.98] cursor-pointer text-sm"
          >
            Assinar & Criar Conta
            <ArrowRight className="w-4 h-4" />
          </button>
          <a
            href="#funcionalidades"
            className="w-full sm:w-auto h-13 px-8 bg-transparent hover:bg-surface-elevated/40 text-foreground font-semibold rounded-xl flex items-center justify-center border border-border hover:border-muted-foreground/30 transition-all duration-200 active:scale-[0.98] text-sm"
          >
            Conhecer Recursos
          </a>
        </div>

        {/* Mockup Preview App */}
        <div className="w-full mt-16 md:mt-24 rounded-2xl border border-border/60 bg-surface/30 backdrop-blur-xl p-3 md:p-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden neon-glow">
          <div className="flex items-center justify-between pb-3 md:pb-4 border-b border-border/40 px-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-danger/20 border border-danger/40" />
              <span className="w-3 h-3 rounded-full bg-warning/20 border border-warning/40" />
              <span className="w-3 h-3 rounded-full bg-neon/20 border border-neon/40" />
            </div>
            <div className="text-xs text-muted-foreground/80 font-mono bg-background/50 py-1 px-3 rounded-md border border-border/20">tamoquite.app/dashboard</div>
            <div className="w-14" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 text-left">
            <div className="p-4 rounded-xl bg-surface-elevated/50 border border-border/40 space-y-2">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total a Receber</span>
              <div className="text-2xl font-bold text-foreground">R$ 3.450,00</div>
              <div className="text-xs text-neon flex items-center gap-1">
                <span>↑ 12% em relação ao mês anterior</span>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-surface-elevated/50 border border-border/40 space-y-2">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Atrasados</span>
              <div className="text-2xl font-bold text-danger">R$ 450,00</div>
              <div className="text-xs text-muted-foreground">2 contatos pendentes</div>
            </div>
            <div className="p-4 rounded-xl bg-surface-elevated/50 border border-border/40 space-y-2">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Próximos Vencimentos</span>
              <div className="text-2xl font-bold text-warning">R$ 1.200,00</div>
              <div className="text-xs text-muted-foreground">Vencendo nos próximos 7 dias</div>
            </div>
          </div>
          <div className="mt-4 rounded-xl bg-background/60 border border-border/30 overflow-hidden text-left">
            <div className="p-3 border-b border-border/30 bg-surface-elevated/40 text-xs font-semibold text-muted-foreground flex justify-between">
              <span>Devedor / Motivo</span>
              <span>Valor</span>
              <span>Status</span>
              <span className="hidden sm:inline">Ação</span>
            </div>
            <div className="divide-y divide-border/20">
              <div className="p-3 text-xs flex justify-between items-center">
                <div>
                  <div className="font-semibold text-foreground">Carlos Alberto</div>
                  <div className="text-[10px] text-muted-foreground">Empréstimo Churrasco</div>
                </div>
                <div className="font-semibold text-foreground">R$ 150,00</div>
                <span className="px-2 py-0.5 rounded-full bg-danger/10 text-danger border border-danger/20 text-[10px]">Atrasado (2d)</span>
                <span className="hidden sm:inline px-2 py-1 bg-neon/10 hover:bg-neon/20 border border-neon/20 text-neon rounded-md font-medium text-[10px] transition-colors cursor-pointer">Cobrar</span>
              </div>
              <div className="p-3 text-xs flex justify-between items-center">
                <div>
                  <div className="font-semibold text-foreground">Beatriz Souza</div>
                  <div className="text-[10px] text-muted-foreground">Ingresso Show</div>
                </div>
                <div className="font-semibold text-foreground">R$ 300,00</div>
                <span className="px-2 py-0.5 rounded-full bg-warning/10 text-warning border border-warning/20 text-[10px]">Hoje</span>
                <span className="hidden sm:inline px-2 py-1 bg-neon/10 hover:bg-neon/20 border border-neon/20 text-neon rounded-md font-medium text-[10px] transition-colors cursor-pointer">Cobrar</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="funcionalidades" className="py-20 border-t border-border/60 bg-surface-elevated/10 relative">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs text-neon uppercase font-bold tracking-widest mb-3">Recursos Premium</h2>
            <p className="text-3xl md:text-4xl font-bold text-foreground">Tudo o que você precisa para ficar quite</p>
            <p className="text-sm text-muted-foreground mt-4 leading-relaxed">
              Esqueça planilhas confusas, anotações de papel e mensagens desagradáveis. O TamoQuite foi pensado para organizar suas finanças mantendo a amizade.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feat, idx) => (
              <div 
                key={idx} 
                className="p-6 rounded-2xl bg-surface border border-border/80 hover:border-neon/30 transition-all duration-300 card-hover flex flex-col"
              >
                <div className="w-12 h-12 rounded-xl bg-neon/5 border border-neon/20 flex items-center justify-center mb-5 shadow-[0_0_15px_rgba(0,255,163,0.05)]">
                  {feat.icon}
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">{feat.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed flex-1">{feat.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="como-funciona" className="py-20 border-t border-border/60 relative">
        <div className="absolute right-1/4 top-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-neon/5 rounded-full blur-[80px] pointer-events-none -z-10" />

        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs text-neon uppercase font-bold tracking-widest mb-3">Fluxo Simples</h2>
            <p className="text-3xl md:text-4xl font-bold text-foreground">Como o TamoQuite funciona?</p>
            <p className="text-sm text-muted-foreground mt-4 leading-relaxed">
              Sem burocracia. O processo foi desenhado para ser feito no seu celular em menos de 1 minuto.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-[1px] bg-gradient-to-r from-neon/10 via-neon/30 to-neon/10 -z-10" />
            
            {steps.map((step, idx) => (
              <div key={idx} className="flex flex-col items-center text-center px-4 relative">
                <div className="w-16 h-16 rounded-2xl bg-surface border border-border/80 flex items-center justify-center mb-6 shadow-[0_4px_20px_rgba(0,0,0,0.4)] relative">
                  <span className="text-xl font-black text-neon">{step.number}</span>
                </div>
                <h3 className="text-lg font-bold text-foreground mb-3">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="precos" className="py-20 border-t border-border/60 bg-surface-elevated/20 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[250px] md:w-[450px] md:h-[450px] bg-neon/10 rounded-full blur-[80px] md:blur-[100px] pointer-events-none -z-10" />

        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="max-w-2xl mx-auto mb-12">
            <h2 className="text-xs text-neon uppercase font-bold tracking-widest mb-3">Preço Justo</h2>
            <p className="text-3xl md:text-4xl font-bold text-foreground">Um único plano. Todos os recursos.</p>
            <p className="text-sm text-muted-foreground mt-4 leading-relaxed">
              Para entrar no sistema, é necessária a assinatura ativa. Crie sua conta de devedores e cobranças de forma ilimitada.
            </p>
          </div>

          {/* Pricing Card */}
          <div className="max-w-md mx-auto rounded-3xl border border-neon/40 bg-surface/80 backdrop-blur-xl p-8 md:p-10 shadow-[0_0_35px_rgba(0,255,163,0.1)] relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-neon text-background text-[10px] font-black uppercase tracking-wider py-1 px-4 rounded-bl-xl">
              Melhor Oferta
            </div>

            <div className="text-left space-y-6">
              <div>
                <h3 className="text-xl font-extrabold text-foreground">Plano Completo</h3>
                <p className="text-xs text-muted-foreground mt-1">Ideal para finanças pessoais e repasses informais.</p>
              </div>

              <div className="flex items-baseline gap-1">
                <span className="text-sm font-semibold text-muted-foreground">R$</span>
                <span className="text-5xl font-black text-foreground tracking-tight">14,90</span>
                <span className="text-sm text-muted-foreground">/mês</span>
              </div>

              <button 
                onClick={handleOpenCheckout}
                className="w-full h-12 bg-neon hover:bg-neon/90 text-background font-bold rounded-xl transition-all duration-200 hover:shadow-[0_0_20px_rgba(0,255,163,0.3)] active:scale-[0.98] cursor-pointer text-sm flex items-center justify-center gap-2"
              >
                Assinar & Começar Agora
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="h-[1px] bg-border/60" />

              <ul className="space-y-3">
                {[
                  "Devedores ilimitados",
                  "Empréstimos e parcelamentos ilimitados",
                  "Cálculo de juros configurável",
                  "Mensagens automáticas para WhatsApp",
                  "Painel com gráficos em tempo real",
                  "PWA Instalável no celular",
                  "Sem fidelidade, cancele a qualquer momento"
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-xs text-muted-foreground">
                    <Check className="w-4 h-4 text-neon flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 border-t border-border/60 relative">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs text-neon uppercase font-bold tracking-widest mb-3">FAQ</h2>
            <p className="text-3xl md:text-4xl font-bold text-foreground">Perguntas Frequentes</p>
          </div>

          <div className="space-y-4 max-w-3xl mx-auto">
            {faqs.map((faq, idx) => (
              <div 
                key={idx} 
                className="rounded-xl border border-border/80 bg-surface/45 overflow-hidden transition-all duration-200"
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-5 flex items-center justify-between text-left text-foreground hover:text-neon transition-colors cursor-pointer"
                >
                  <span className="font-bold text-sm md:text-base">{faq.question}</span>
                  <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${activeFaq === idx ? 'rotate-180 text-neon' : ''}`} />
                </button>
                {activeFaq === idx && (
                  <div className="p-5 pt-0 border-t border-border/20 text-xs md:text-sm text-muted-foreground leading-relaxed bg-background/25">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border/60 bg-surface/20">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-neon flex items-center justify-center shadow-[0_0_10px_rgba(0,255,163,0.3)]">
              <Zap className="w-3.5 h-3.5 text-background" />
            </div>
            <span className="font-extrabold tracking-tight text-foreground text-base">TamoQuite</span>
          </div>

          <p className="text-xs text-muted-foreground/80">
            © {new Date().getFullYear()} TamoQuite. Todos os direitos reservados.
          </p>

          <div className="flex items-center gap-6">
            <a href="#precos" className="text-xs text-muted-foreground hover:text-neon transition-colors">Plano</a>
            <span className="text-muted-foreground/30 text-xs">|</span>
            <a href="#faq" className="text-xs text-muted-foreground hover:text-neon transition-colors">Suporte</a>
          </div>
        </div>
      </footer>

      {/* Premium Checkout Modal */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md transition-all">
          <div className="relative w-full max-w-md bg-surface border border-border/80 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="p-6 pb-4 border-b border-border/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-neon flex items-center justify-center">
                  <Zap className="w-4 h-4 text-background" />
                </div>
                <span className="font-bold text-foreground">Assinar TamoQuite</span>
              </div>
              <button 
                onClick={handleCloseCheckout}
                className="p-1.5 rounded-lg bg-secondary hover:bg-surface-elevated text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content based on step */}
            <div className="p-6">
              
              {/* STEP 1: Create User Account */}
              {checkoutStep === 'CREATE_ACCOUNT' && (
                <form onSubmit={handleRegisterSubmit} className="space-y-4">
                  <div className="text-center mb-4">
                    <p className="text-xs text-neon uppercase font-bold tracking-wider">Passo 1 de 2</p>
                    <h3 className="text-lg font-bold text-foreground mt-1">Crie sua conta de acesso</h3>
                    <p className="text-xs text-muted-foreground mt-1">Insira seus dados para criar a conta e continuar para a etapa de assinatura.</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Nome Completo</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        <User className="w-4 h-4" />
                      </span>
                      <input 
                        type="text" 
                        placeholder="Seu nome" 
                        required
                        disabled={loading}
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        className="w-full h-11 pl-10 pr-3 bg-secondary border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-neon/50 focus:ring-1 focus:ring-neon/20 transition-all disabled:opacity-50"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">E-mail</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        <Mail className="w-4 h-4" />
                      </span>
                      <input 
                        type="email" 
                        placeholder="seu@email.com" 
                        required
                        disabled={loading}
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        className="w-full h-11 pl-10 pr-3 bg-secondary border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-neon/50 focus:ring-1 focus:ring-neon/20 transition-all disabled:opacity-50"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Senha de Acesso</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        <Key className="w-4 h-4" />
                      </span>
                      <input 
                        type="password" 
                        placeholder="No mínimo 6 caracteres" 
                        required
                        disabled={loading}
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        className="w-full h-11 pl-10 pr-3 bg-secondary border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-neon/50 focus:ring-1 focus:ring-neon/20 transition-all disabled:opacity-50"
                      />
                    </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 bg-neon text-background font-bold rounded-xl transition-all duration-200 mt-4 cursor-pointer text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        Criar Conta & Continuar
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* STEP 2: Stripe Checkout Information and Button */}
              {checkoutStep === 'PAYMENT_METHOD' && (
                <div className="space-y-6 text-center">
                  <div className="text-center">
                    <p className="text-xs text-neon uppercase font-bold tracking-wider">Passo 2 de 2</p>
                    <h3 className="text-lg font-bold text-foreground mt-1">Assinatura Premium</h3>
                    <p className="text-xs text-muted-foreground mt-1">Você está assinando o Plano Completo do TamoQuite.</p>
                  </div>

                  <div className="p-5 rounded-2xl bg-secondary/30 border border-border/80 text-left space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-foreground font-medium">Plano Completo</span>
                      <span className="text-lg font-bold text-neon">R$ 14,90 / mês</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Libere acesso ilimitado a cadastros de devedores, empréstimos, atualizações de juros e cobranças por WhatsApp. Sem fidelidade, cancele quando quiser.
                    </p>
                  </div>

                  <button 
                    onClick={handleStripeCheckout}
                    disabled={loading}
                    className="w-full h-12 bg-neon text-background font-bold rounded-xl hover:shadow-[0_0_20px_rgba(0,255,163,0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        Ir para o Pagamento Seguro
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <p className="text-[10px] text-muted-foreground/60">
                    Você será redirecionado para a plataforma segura do Stripe para concluir a transação.
                  </p>
                </div>
              )}

              {/* PROCESSING: Redirecting to Stripe */}
              {checkoutStep === 'PROCESSING' && (
                <div className="py-8 text-center space-y-6 animate-in fade-in duration-300">
                  <div className="w-16 h-16 rounded-full bg-neon/15 border border-neon/30 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(0,255,163,0.2)]">
                    <Loader2 className="w-8 h-8 text-neon animate-spin" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-foreground">Conta criada!</h3>
                    <p className="text-xs text-muted-foreground max-w-xs mx-auto">Redirecionando para o pagamento seguro...</p>
                  </div>
                </div>
              )}

              {/* STEP 6: Success Redirect */}
              {checkoutStep === 'SUCCESS' && (
                <div className="py-8 text-center space-y-6 animate-in fade-in duration-300">
                  <div className="w-16 h-16 rounded-full bg-neon/15 border border-neon/30 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(0,255,163,0.2)]">
                    <Check className="w-8 h-8 text-neon" />
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-foreground">Tudo pronto!</h3>
                    <p className="text-xs text-muted-foreground max-w-xs mx-auto">Sua conta foi criada e sua assinatura está ativa. Redirecionando você para o painel administrativo...</p>
                  </div>

                  <div className="w-8 h-8 border-2 border-neon/30 border-t-neon rounded-full animate-spin mx-auto" />
                </div>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
