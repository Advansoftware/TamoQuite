# 01 — Simplificação de UI/UX

> Problema relatado: "tá muito complexo essas configurações na tela de empréstimo, muitos usuários não entendem."
> Meta: o caminho comum tem que ser óbvio; o avançado fica escondido.

## A. Tela/dialog de novo empréstimo (`CreateLoanDialog.tsx`, 633 linhas)

### Problema
Hoje o formulário mostra tudo de uma vez: pessoa, valor, toggle de tipo de pagamento, toggle de cálculo (Informar Taxa / Informar Total), taxa, total, valor de parcela opcional, periodicidade, nº de parcelas, data. É muita decisão junta.

### Solução — progressive disclosure
Dividir em **essencial** (sempre visível) + **avançado** (colapsado).

**Essencial (o que 90% precisa):**
1. Pessoa
2. Valor emprestado
3. Como vai receber: **[ À vista (1x) ]  [ Parcelado ]**
4. Juros (%) — campo único, opcional (0 = sem juros)
5. Nº de parcelas (só se parcelado) + data do 1º vencimento

**Avançado (colapsável "Opções avançadas", fechado por padrão):**
- Alternar cálculo por **Total a receber** em vez de por %
- Periodicidade (semanal/quinzenal/mensal) — padrão mensal
- Valor da parcela (deriva o nº de parcelas)

### Melhorias adicionais
- **Resumo sempre visível** ("Você empresta R$ 200 e recebe R$ 220 em 2× de R$ 110") em vez do bloco "Prévia do Cálculo" técnico.
- Textos em linguagem do usuário: "Quanto vai receber?" em vez de "Informar Total".
- Validação inline amigável (não travar botão sem dizer o porquê).
- Considerar transformar em **wizard de 2 passos** no mobile (Pessoa+Valor → Condições), com o dialog full-screen que o projeto já usa.

## B. Configurações de cobrança por contrato (`LoanBillingCard.tsx`)

### Problema
Cada empréstimo mostra: não cobrar, modo WhatsApp (herda/manual/meu número/plataforma), lembrar antes, dias antes, no vencimento, atraso, intervalo… O usuário comum nunca mexe nisso.

### Solução
- Colapsar tudo atrás de **"Configurações de cobrança (opcional)"**, fechado por padrão.
- Mostrar só um resumo do que está herdado do global ("Cobrança automática ligada, herdando das configurações gerais").
- Deixar explícito que o padrão já funciona — o card só existe pra exceções.

## C. Configurações globais (`SettingsView.tsx`, 920 linhas)

### Problema
Arquivo gigante misturando: WhatsApp (conexão/QR), modo de cobrança, templates, assinatura, admin do pool global. Difícil achar as coisas.

### Solução
- Quebrar em **abas/seções por assunto** já existe parcialmente; extrair cada aba num componente próprio (`features/billing/SettingsWhatsapp`, `SettingsTemplates`, `SettingsSubscription`).
- Linguagem: "Meu número" / "Número TamoQuite" / "Manual" com uma frase de ajuda cada (já existe, manter).
- Esconder o pool global (admin) para quem não é admin (já é o caso; confirmar).

## D. Navegação mobile — remover avatar, menu no bottom nav

> Pedido: "remover o avatar e colocar o menu no navbottom quando em mobile."

### Situação hoje
- `(app)/layout.tsx`: header tem um **avatar** (`w-8 h-8 rounded-full`) que dispara `open-settings-dialog` — só aparece em `md:` (desktop). No mobile ele não aparece, mas o header ainda ocupa espaço.
- `Navigation.tsx` (`BottomNav`, `md:hidden`): já tem as abas Painel/Pessoas/Empréstimos (+Admin) e já contém os dialogs de Configurações e Trocar Senha (via evento `open-settings-dialog`).

### Solução
1. **Remover o avatar do header** (ou o header inteiro no mobile, mantendo só logo + sino de notificações).
2. Adicionar um item **"Conta"/"Menu"** no `BottomNav` (ícone de usuário ou `Settings`) que abre o mesmo sheet de conta (perfil, trocar senha, assinatura, sair).
   - Como o bottom nav pode ficar com muitos itens, avaliar: 4 itens de navegação + 1 "Menu" que abre um **sheet** (`components/ui/sheet.tsx` já existe) com as ações de conta.
3. Mover o **sino de notificações** para um lugar consistente (header no mobile OU um item no bottom nav). Recomendo manter o sino no header (topo) e jogar só conta/config pro bottom.
4. Garantir que Configurações/Trocar Senha/Sair fiquem acessíveis pelo bottom nav sem depender do avatar.

### Checklist mobile
- [ ] Header mobile: logo + sino (sem avatar)
- [ ] Bottom nav: Painel · Pessoas · Empréstimos · (Admin) · Conta
- [ ] "Conta" abre sheet com: nome/email, Configurações, Trocar senha, Assinatura, Sair
- [ ] Desktop mantém o header atual (ou também migra pro padrão novo, decidir)

## Critérios de aceite (UI/UX)
- Um usuário novo cria um empréstimo à vista sem tocar em nenhuma opção avançada.
- Um usuário novo cria um empréstimo parcelado com juros informando só %, parcelas e data.
- Nenhuma config de cobrança por contrato aparece sem o usuário pedir.
- No mobile, todas as ações de conta estão no bottom nav; não há avatar no header.
