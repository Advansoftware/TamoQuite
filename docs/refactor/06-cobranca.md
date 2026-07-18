# 06 — Simplificação da Cobrança (prioridade)

> "muita gente não entendeu como funciona, principalmente na parte da cobrança."
> Esta é a área mais confusa hoje. Simplicidade aqui é prioridade máxima.

## Por que confunde hoje

O usuário é exposto a conceitos demais, com nomes técnicos e espalhados:
- **3 modos** de cobrança: `MANUAL`, `OWN` ("Meu número"), `GLOBAL` ("Número TamoQuite").
- Diferença "meu número" × "número da plataforma" (conexão via QR code, anti-ban, etc.) — detalhe interno que o usuário não deveria precisar entender.
- Automático com **lembrete X dias antes / no vencimento / atraso a cada N dias** + **templates** editáveis.
- **Override por contrato** (`LoanBillingCard`) repetindo todas essas opções.
- Ações pontuais: "Enviar agora" vs "Abrir no WhatsApp", cobrança consolidada de atrasados.

Resultado: a pessoa não sabe se a cobrança vai sair, de qual número, quando, nem como disparar na hora.

## Princípio: 2 escolhas, linguagem humana

Reduzir a decisão principal a **duas opções claras**, com o resto como padrão que já funciona:

> **Como você quer cobrar?**
> - 🧑 **Eu mesmo envio** — o app monta a mensagem pronta e você manda pelo seu WhatsApp com 1 toque. (= MANUAL)
> - 🤖 **O sistema cobra por mim** — as mensagens saem sozinhas na data certa. (= automático)

A distinção **"meu número" × "número TamoQuite"** vira um sub-passo **só** de quem escolheu automático, com um padrão recomendado e explicação curta:
> "As cobranças automáticas podem sair do **seu WhatsApp** (você conecta uma vez) ou do **número da TamoQuite** (mais simples, sem conectar nada). Recomendado: número da TamoQuite."

Assim quem não quer pensar escolhe "sistema cobra por mim" e pronto — sai do número da plataforma, sem QR code.

## Fluxo proposto

### 1. Onboarding de cobrança (uma vez)
Um passo simples no primeiro uso (ou em Configurações):
- Escolhe **Eu mesmo** ou **Sistema cobra**.
- Se "sistema cobra": escolhe o número (padrão TamoQuite) e **quando** avisar, com padrões prontos ("3 dias antes, no dia, e a cada 3 dias se atrasar"). Um único conjunto de padrões bons — não obrigar a configurar nada.

### 2. Explicação sempre visível
Card curto no topo da área de cobrança dizendo, em uma frase, **o que vai acontecer**:
> "✅ Cobrança automática ligada. Vamos avisar seus devedores 3 dias antes, no dia e a cada 3 dias de atraso, pelo número da TamoQuite."
Com um link discreto "mudar".

### 3. Ação pontual clara ("cobrar agora")
Um único botão **Cobrar** por parcela/pessoa. Ao tocar:
- Se modo automático → "Enviar cobrança agora" (manda na hora).
- Se manual → abre o WhatsApp com a mensagem pronta.
Não mostrar as duas coisas como escolha técnica toda vez; seguir o modo já escolhido, com uma opção secundária discreta ("enviar de outro jeito").

### 4. Cobrança de atrasados (consolidada)
Manter, mas com o mesmo padrão do botão **Cobrar** (segue o modo escolhido). Texto claro: "Cobrar os X atrasados de uma vez".

## Config avançada = escondida

- **Templates de mensagem**: escondidos atrás de "Personalizar mensagens (opcional)". Padrões prontos e amigáveis já entregam valor.
- **Override por contrato** (`LoanBillingCard`): colapsado em "Este contrato cobra diferente? (opcional)". Por padrão herda tudo do global e mostra só um resumo.
- **Dias/intervalos**: presets ("Suave", "Padrão", "Insistente") em vez de vários campos numéricos soltos. Avançado abre os campos.

## Linguagem (regras)
- Nunca termos técnicos internos (não citar "Evolution", "instância", "webhook", "pool").
- "Devedor" → considerar "quem te deve"/"contato" conforme o tom do app (manter consistente).
- Verbos de ação diretos: **Cobrar**, **Enviar agora**, **Dar baixa**.
- Toda opção tem 1 frase de ajuda embaixo.

## Checklist
- [ ] Decisão principal reduzida a 2 opções (eu mesmo / sistema cobra)
- [ ] "meu número × número TamoQuite" vira sub-passo só do automático, com padrão recomendado
- [ ] Card de status explicando em 1 frase o que vai acontecer
- [ ] Botão único **Cobrar** que segue o modo escolhido
- [ ] Templates e override por contrato escondidos atrás de "opcional"
- [ ] Presets de frequência (Suave/Padrão/Insistente) no lugar de campos numéricos
- [ ] Varredura de linguagem: zero jargão técnico, 1 frase de ajuda por opção
