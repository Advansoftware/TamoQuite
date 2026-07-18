# TamoQuite — Plano de Refatoração e Arquitetura

> Documento-guia. O objetivo é transformar o projeto num código **limpo, consistente e testado**,
> sem mudar o que o usuário final já usa (só melhorar). Refatoração é feita em fases pequenas,
> cada uma com testes verdes antes de seguir.

## Objetivos

1. **Simplificar a interface — em todo lugar que der** — a maioria dos usuários não entende como funciona, **principalmente a cobrança**. (ver [01-ui-ux.md](./01-ui-ux.md) e o doc dedicado [06-cobranca.md](./06-cobranca.md))
2. **Arquitetura frontend sólida** — padronizar data-fetching, extrair hooks de domínio, quebrar componentes gigantes. (ver [02-frontend.md](./02-frontend.md))
3. **Arquitetura backend sólida** — tirar regra de negócio dos controllers, DTOs + validação, erros consistentes. (ver [03-backend.md](./03-backend.md))
4. **Tema num arquivo de tema** — design tokens centralizados, claro/escuro consistente. (ver [04-design-system.md](./04-design-system.md))
5. **Testes que validam tudo** — unit, integração e e2e; incluindo o "bug dos 5 cadastros". (ver [05-testing.md](./05-testing.md))

## Princípios

- **Simplicidade em primeiro lugar, em todo lugar**: se dá pra simplificar, simplifica. O caminho comum tem que ser óbvio pra quem nunca usou. A **cobrança** é a prioridade nº1 de simplificação (é onde mais gente se perdeu) — ver [06-cobranca.md](./06-cobranca.md).
- **Progressive disclosure**: o simples aparece primeiro; o avançado fica escondido atrás de "Opções avançadas".
- **Uma forma de fazer cada coisa**: 1 jeito de buscar dados (React Query), 1 jeito de tema (tokens), 1 jeito de validar (DTOs).
- **Componentes burros, hooks espertos**: UI não busca dado direto; consome hooks (`useLoans`, `useCreateLoan`…).
- **Sem regressão**: cada fase entra com testes cobrindo o comportamento atual antes de mexer.
- **Nada de gambiarra de lint**: hoje há `setTimeout(() => fetch(), 0)` espalhado só pra driblar a regra `set-state-in-effect` — isso some quando o data-layer virar React Query.

## Diagnóstico atual (resumo)

| Área | Situação hoje | Problema |
|------|---------------|----------|
| Componentes | `SettingsView` 920 linhas, `LoanDetailView` 808, `LandingPage` 795, `CreateLoanDialog` 633 | Monólitos: UI + fetch + regra juntos, difícil manter/testar |
| Data fetching | React Query só em `LoanDetailView`; resto é `fetch + useState + useEffect + setTimeout(0)` | Inconsistente, race conditions, provável causa do bug dos 5 cadastros |
| Hooks | `src/hooks/` só tem defaults do shadcn | Nenhum hook de domínio |
| Estado global | Zustand (`store.ts`) com `refreshKey` para forçar refetch manual | Anti-padrão; React Query invalida cache sozinho |
| Backend | Regra de negócio dentro dos controllers (ex.: `installments.controller.ts`) | Difícil testar, sem camada de serviço |
| Validação | Checagem manual (`if (!x) throw`) em cada controller | Sem DTO/`class-validator`, inconsistente |
| Testes | **Zero**, sem script de teste | Nada garante que a refatoração não quebra |
| Tema | CSS vars em `globals.css` + `tailwind.config.ts` | Sem arquivo de tokens central, sem doc |

## Roadmap por fases

Cada fase é um PR pequeno e revisável. Ordem pensada pra reduzir risco.

- **Fase 0 — Rede de segurança** ([05-testing.md](./05-testing.md))
  Configurar Vitest + Testing Library (web) e Jest e2e (api). Escrever testes de caracterização do fluxo crítico (login, criar devedor, criar empréstimo, cobrar). **Reproduzir e documentar o bug dos 5 cadastros.**
- **Fase 1 — Design system / tema** ([04-design-system.md](./04-design-system.md))
  Centralizar tokens num arquivo de tema; garantir claro/escuro; remover cores hardcoded.
- **Fase 2 — Data layer frontend** ([02-frontend.md](./02-frontend.md))
  Padronizar React Query, criar hooks de domínio, remover `refreshKey` e `setTimeout(0)`.
- **Fase 3 — Decomposição de componentes** ([02-frontend.md](./02-frontend.md))
  Quebrar os monólitos em `features/<domínio>/` (componentes + hooks + tipos).
- **Fase 4 — Simplificação de UI/UX** ([01-ui-ux.md](./01-ui-ux.md) + [06-cobranca.md](./06-cobranca.md))
  **Cobrança simplificada (prioridade)**: 2 opções claras (eu mesmo / sistema cobra), avançado escondido. Form de empréstimo simples vs. avançado. Nav mobile (remover avatar, menu no bottom nav).
- **Fase 5 — Arquitetura backend** ([03-backend.md](./03-backend.md))
  Extrair services, DTOs + `ValidationPipe`, filtro de exceção global, testes de service.
- **Fase 6 — Validação final** ([05-testing.md](./05-testing.md))
  Suíte completa verde; e2e criando 5 cadastros; smoke test manual guiado.

## Estrutura-alvo (frontend)

```
src/
  app/                # rotas (App Router) — só orquestração
  features/
    loans/            # useLoans, useCreateLoan, LoanForm, LoanCard, types
    borrowers/
    billing/
    subscription/
    notifications/
  components/ui/       # shadcn (design system base)
  lib/                # api client, query keys, helpers puros
  theme/              # tokens + provider de tema
  hooks/              # hooks genéricos (use-mobile, etc.)
```

## Estrutura-alvo (backend)

```
src/
  <módulo>/
    <módulo>.controller.ts   # só HTTP: rota, DTO, chama service
    <módulo>.service.ts      # regra de negócio (testável)
    dto/                     # class-validator
  common/
    guards/  pipes/  filters/  decorators/
```

## Regras de execução

- Uma fase por vez; não começar a próxima sem os testes da anterior verdes.
- Toda regra de negócio movida ganha teste antes de mover (caracterização).
- Nada de mudança de comportamento visível sem o usuário pedir — refatoração é invisível pro cliente.
