# Publicação na Google Play — TamoQuite 1.0.0

## ⚠️ Antes de tudo: guarde o keystore

O app foi assinado com um keystore de upload gerado agora:

| Item | Onde está |
|---|---|
| Keystore | `~/keystores/tamoquite-upload.jks` |
| Senha (store e key) | `~/keystores/.tamoquite-pw` |
| Alias | `tamoquite` |
| Credenciais do build | `apps/mobile/android/key.properties` (gitignorado) |
| Cópia de segurança | `~/Downloads/tamoquite-playstore/BACKUP-tamoquite-upload.jks` |

**Faça backup do `.jks` e da senha em um gerenciador de senhas ou cofre.**
Sem eles você não consegue publicar atualizações com este keystore. (Com o
Play App Signing ativado dá para pedir reset da chave de upload ao Google,
mas é um processo lento — evite depender disso.)

Ambos os arquivos estão fora do Git. Nunca versione nenhum dos dois.

---

## Arquivos para enviar

Em `~/Downloads/tamoquite-playstore/`:

| Arquivo | Uso |
|---|---|
| `tamoquite-1.0.0-1.aab` | O app. Envie em *Produção → Criar versão* |
| `play-icon-512.png` | Ícone da ficha (512×512) |
| `BACKUP-tamoquite-upload.jks` | **Não envie** — mova para um cofre |

O AAB tem ~52 MB porque inclui arm64, armv7 e x86_64. O Google Play divide
por aparelho: o download real fica em torno de 15–20 MB.

---

## Configuração no Play Console

### Identidade do app
- **Nome:** TamoQuite
- **Package:** `app.tamoquite.mobile` (bate com o `applicationId`)
- **Versão:** 1.0.0 (versionCode 1)
- **Categoria sugerida:** Finanças
- **Idioma padrão:** Português (Brasil)

### Assinatura
Ative **Play App Signing** (padrão para AAB). O `.jks` acima vira sua *chave
de upload*; o Google gerencia a chave de assinatura final.

### Ficha da loja (obrigatórios)
- Ícone 512×512 → `play-icon-512.png`
- Gráfico de destaque 1024×500 → **ainda falta criar**
- No mínimo 2 capturas de tela de celular (mín. 320px no menor lado)
- Descrição curta (≤ 80 caracteres)
- Descrição completa (≤ 4000 caracteres)

### Política de Privacidade
Obrigatória. O site já tem: `https://tamoquite.app/privacidade`.

### Segurança dos dados (formulário)
Declare, com base no que o app realmente faz hoje:

| Dado | Coletado | Finalidade |
|---|---|---|
| Email | Sim | Autenticação da conta |
| Nome | Sim | Identificação na conta |
| Dados financeiros de terceiros (parcelas, devedores) | Sim | Funcionalidade do app |
| Dados biométricos | **Não** | A digital nunca sai do aparelho (API do Android) |

Marque: dados **em trânsito criptografados** (HTTPS) e que o usuário pode
pedir exclusão da conta.

### Classificação de conteúdo
Questionário padrão. App utilitário/financeiro, sem conteúdo sensível →
deve resultar em Livre / 3+.

### Público-alvo
18+. Não marque "voltado a crianças".

---

## ⚠️ Ponto de atenção: pagamento fora do app

O app exige assinatura ativa, contratada via Stripe **no site**. Isso toca a
política de Google Play Billing.

A tela de assinatura foi construída com isso em mente: ela **apenas informa**
que é necessária uma assinatura ativa, sem botão de pagamento e sem link para
checkout externo. Esse é o formato que costuma passar na revisão.

**Não adicione** botão "Assinar agora" apontando para o site sem antes checar
a política vigente — é a causa mais comum de reprovação nesse cenário.

Se a revisão questionar, os caminhos usuais são: (a) integrar Google Play
Billing para assinaturas compradas no app, ou (b) demonstrar que o app é uma
ferramenta corporativa cujo acesso é provisionado fora da loja.

---

## Antes de enviar, teste o AAB de verdade

O bundle nunca foi executado em aparelho. Vale instalar via *Teste interno*
(ou `bundletool`) e conferir, contra a API de produção:

1. Login com credenciais reais
2. Carregamento do painel com dados
3. Ativação e uso do bloqueio por digital
4. Tela de assinatura para uma conta sem plano ativo

---

## Próximas versões

Incremente o build number a cada envio — o Play rejeita versionCode repetido:

```bash
flutter build appbundle --release --build-number=2
```

Ou atualize `version: 1.0.0+2` no `pubspec.yaml`.
