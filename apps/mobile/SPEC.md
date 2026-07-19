# TamoQuite Mobile — Especificação

App Flutter do TamoQuite. Consome a mesma API NestJS do site (`apps/api`) e
replica o visual de `apps/web`.

- **Package / applicationId:** `app.tamoquite.mobile`
- **Dart package:** `tamoquite`
- **Plataformas:** Android (foco) e iOS

---

## 1. Origem do design

Todos os tokens vêm de `apps/web/src/app/theme.css`. O site é **dark-only**;
o app mantém o escuro idêntico e deriva um tema claro do mesmo seed.

| Token (web) | Valor | Onde entra no app |
|---|---|---|
| `--primary` / `--neon` | `#00FFA3` | `seedColor` + `colorScheme.primary` |
| `--background` | `#080C12` | `colorScheme.surface` (escuro) |
| `--card` / `--surface` | `#111827` | `surfaceContainer` |
| `--surface-elevated` | `#1A1F2E` | `surfaceContainerHigh` |
| `--foreground` | `#F1F5F9` | `onSurface` |
| `--muted-foreground` | `#6B7280` | `onSurfaceVariant` |
| `--border` | `rgba(255,255,255,.08)` | `outline` |
| `--destructive` | `#EF4444` | `colorScheme.error` |
| `--warning` | `#F59E0B` | `AppBrandColors.warning` |
| `--radius` | `0.75rem` (12px) | `AppTheme.radius` |

**Tipografia:** Geist Sans (400/500/600/700), copiada de
`apps/web/node_modules/geist/dist/fonts/geist-sans` para `assets/fonts/`.
Cópia local em vez de download garante correspondência exata com o site.

Tokens sem slot no Material 3 (`surfaceElevated`, `whatsapp`, `warning`,
`neonDim`) vivem em `AppBrandColors`, um `ThemeExtension` — lido como
`Theme.of(context).brand.neon`.

**Altura de controle:** 48px (`h-12` no site). Alvo de toque mínimo: 44px.

---

## 2. API

Base configurada em `AppConfig`:

- Release: `https://api.tamoquite.app`
- Debug: `http://10.0.2.2:3042` (host da máquina, visto do emulador)
- Override: `--dart-define=API_URL=...`

Prefixo global `/api` (definido em `apps/api/src/main.ts`).

### Endpoints usados

| Endpoint | Uso |
|---|---|
| `POST /api/auth/login` | Retorna `{ token, user }` |
| `GET /api/auth/me` 🔒 | Revalida sessão e status de assinatura |
| `POST /api/auth/forgot-password` | Envia link de redefinição |
| `GET /api/dashboard` 🔒💳 | Métricas do painel |

🔒 exige JWT · 💳 exige assinatura ativa (`SubscriptionGuard`)

### Autenticação

JWT Bearer. O token vai no header `Authorization` por um interceptor do Dio e
é persistido no **Keystore/Keychain** via `flutter_secure_storage` (o site usa
`localStorage`; no app o equivalente seguro é o armazenamento do sistema).

### Gate de assinatura

Espelha `apps/api/src/common/subscription.guard.ts`:

- Acesso liberado com `subscriptionStatus ∈ {active, trialing}`
- `role === 'ADMIN'` ignora o paywall
- Bloqueio do servidor devolve **403 + `code: SUBSCRIPTION_INACTIVE`**;
  o `ApiClient` intercepta e marca a sessão como inativa na hora, sem
  esperar o próximo `/me` (mesmo comportamento de `apps/web/src/lib/api.ts`)

O servidor continua sendo a autoridade — o app só evita exibir telas que
seriam barradas de qualquer forma.

---

## 3. Navegação e gates

`go_router` com todo o controle de acesso centralizado no `redirect`, na
mesma ordem de `apps/web/src/app/(app)/layout.tsx`:

```
1. sessão carregando     → /          (splash)
2. sem sessão            → /login
3. bloqueio local ativo  → /bloqueio
4. sem assinatura        → /assinatura
5. liberado              → /dashboard (shell com abas)
```

Concentrar isso no router garante que nenhum deep link pule um gate.

### Abas (`StatefulShellRoute.indexedStack`)

Iguais ao `BottomNav` do site, sem a aba Admin. Cada aba mantém sua própria
pilha de navegação.

| Aba | Rota | Estado |
|---|---|---|
| Painel | `/dashboard` | ✅ implementada |
| Clientes | `/borrowers` | placeholder |
| Empréstimos | `/loans` | placeholder |
| Mais | `/mais` | conta, bloqueio do app, logout |

Em telas ≥ 640px a `NavigationBar` inferior vira `NavigationRail` lateral.

---

## 4. Bloqueio do app (biometria)

O JWT persiste entre execuções, então o usuário **já não digita senha toda
vez**. A biometria não substitui o login: ela protege o acesso local à sessão
já salva, como em apps de banco.

- A senha **nunca** é armazenada no dispositivo
- `local_auth` com `biometricOnly: false` → cai no PIN/padrão do sistema
- Ativar exige autenticação prévia (evita ligar um bloqueio que o usuário
  não conseguiria abrir depois)
- Convite aparece **uma vez**, após o primeiro login; depois fica em *Mais*
- Falhar no desbloqueio não desloga — dá para sair da conta pela tela

`MainActivity` estende `FlutterFragmentActivity`: o prompt biométrico do
Android é um `DialogFragment` e exige uma `FragmentActivity` como host.

---

## 5. Estrutura

```
lib/
├── main.dart                  # bootstrap + locale pt_BR
├── app.dart                   # MaterialApp.router
├── core/
│   ├── config/                # AppConfig (API_URL via --dart-define)
│   ├── network/               # ApiClient (Dio) + ApiException
│   ├── router/                # go_router + gates
│   ├── responsive/            # Breakpoints, ResponsiveBuilder
│   ├── security/              # biometria + preferências de bloqueio
│   ├── storage/               # TokenStorage (secure storage)
│   ├── theme/                 # cores, tipografia, AppTheme, AppBrandColors
│   ├── utils/                 # Formatters (pt-BR)
│   ├── providers/             # providers de infraestrutura
│   └── widgets/               # TqLogo, TqTextField, TqPrimaryButton, estados
└── features/
    └── <feature>/
        ├── domain/            # modelos + regras
        ├── data/              # repositório (fala com ApiClient)
        ├── application/       # controllers Riverpod
        └── presentation/      # telas + widgets/
```

**Camadas:** `presentation → application → data → domain`. Widget nunca chama
`ApiClient` direto.

**Estado:** Riverpod 3 com `Notifier`/`AsyncNotifier` escritos à mão —
sem `build_runner`, para não exigir etapa de geração de código.

**Convenção:** arquivos pequenos e focados; widgets de uma tela ficam em
`presentation/widgets/` da própria feature.

---

## 6. Responsividade

Breakpoints alinhados ao Tailwind do site:

| Classe | Largura | Layout |
|---|---|---|
| `mobile` | < 640 | 1 coluna, bottom nav, métricas 2×2 |
| `tablet` | 640–1023 | rail lateral, métricas 4×1, listas lado a lado |
| `desktop` | ≥ 1024 | rail estendido, conteúdo limitado a 1024px |

Decisões vêm de `LayoutBuilder` (`ResponsiveBuilder`), não de tamanhos fixos.
A escala de fonte do sistema é limitada a 0.85–1.3 para não quebrar os cards.

---

## 7. Comandos

```bash
# rodar contra a API local (emulador Android)
flutter run --dart-define=API_URL=http://10.0.2.2:3042

# qualidade
flutter analyze && flutter test

# release para a Play Store (usa api.tamoquite.app)
flutter build appbundle --release
```

O keystore de release fica em `android/key.properties` + `.jks`, ambos
**gitignorados**. Sem esses arquivos o build cai no keystore de debug.

---

## 8. Fora de escopo nesta versão

Telas de Clientes, Empréstimos, Cobranças, Relatórios, Configurações e Admin
(a última não entra no app). A troca de senha obrigatória
(`mustChangePassword`) ainda não tem tela — hoje o usuário nessa situação
entra normalmente; o site continua sendo o caminho para trocar a senha.
