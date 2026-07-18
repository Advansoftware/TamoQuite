# 05 — Estratégia de Testes

> Pedido: "testes para validar corretamente tudo… testar criar 5 cadastros no front (parece que buga
> algo no fundo)… testa tudo que der."
> Meta: rede de segurança que permita refatorar sem medo + reproduzir/corrigir o bug dos 5 cadastros.

## Stack de teste

### Frontend (`apps/web`)
- **Vitest** + **@testing-library/react** + **@testing-library/user-event** + **jsdom**.
- **MSW** (Mock Service Worker) para simular a API nos testes de componente/hook.
- Script: `"test": "vitest"`, `"test:ci": "vitest run"`.

### Backend (`apps/api`)
- **Jest** (já vem com NestJS) para unit de services.
- **Supertest** para e2e de controllers com um banco de teste (MySQL de teste ou schema separado; `prisma db push` no setup).
- Script: `"test": "jest"`, `"test:e2e": "jest --config test/jest-e2e.json"`.

### E2E de ponta a ponta (opcional, fase final)
- **Playwright** para o fluxo real no navegador (login → criar devedor → criar empréstimo → cobrar). É aqui que o "criar 5 cadastros" é validado de verdade.

## Pirâmide de testes (o que cobrir)

### Unit (rápidos, muitos)
- `loan-math.ts` — juros simples, à vista, por total, 0%, arredondamento. **Prioridade máxima (é dinheiro).**
- `helpers.ts` / `phone.ts` — formatação de moeda, data, telefone, `hasActiveSubscription`.
- Services do backend: `LoansService.create`, `InstallmentsService.{payFull,payPartial,payInterest,rollRemaining,undo*}`, cálculo de cobrança.

### Integração (hooks + componentes com MSW)
- `useCreateLoan` → invalida cache e a lista atualiza.
- `LoanForm` — fluxos essencial e avançado; validação.
- `NotificationBell` — aparece aviso quando faltam ≤ N dias.
- Guarda de assinatura: 403 `SUBSCRIPTION_INACTIVE` leva à tela de bloqueio.

### e2e (backend, Supertest)
- Auth (login, me), CRUD de borrower, criar loan, cobrar, webhook Stripe (assinado).
- **Cenário dos 5 cadastros** (ver abaixo).

## 🐞 Bug dos 5 cadastros — plano de investigação

> "testar criar 5 cadastros no front, parece que buga algo no fundo, nunca vi."

### Hipóteses (por probabilidade)
1. **Race no data-fetching manual** — a maioria das listas usa `fetch + useState + useEffect + setTimeout(() => fetch(), 0)` + `refreshKey` do Zustand. Criar vários rápido pode: (a) refetch em cima de refetch, (b) `setState` em componente desmontado, (c) lista com item duplicado/ausente, (d) `refreshKey` disparando cascata. **Suspeito nº1.**
2. **Chave de lista/React key** — uso de índice como key em alguma lista causaria remount errado.
3. **N+1 em `fetchLoanData`** — `LoanDetailView` busca partial-payments em paralelo por parcela; com muitos itens pode estourar/embaralhar.
4. **Backend** — algum write sem transação (rolagem/undo) deixando estado inconsistente; ou índice/constraint.
5. **Optimistic/stale cache** — mistura de React Query (LoanDetailView) com fetch manual no resto → uma tela não vê o que a outra criou.

### Passos
1. **Reproduzir**: e2e (Playwright) criando 5 devedores e 5 empréstimos em sequência rápida; asserir que os 5 aparecem, sem duplicar, e que dashboard/contadores batem.
2. **Instrumentar**: logar chamadas de API e re-renders durante o fluxo.
3. **Isolar**: repetir criando via API direto (Supertest) — se o backend estiver certo, o bug é no data-layer do front (confirma hipótese 1).
4. **Corrigir**: a correção provavelmente cai fora de graça ao migrar para React Query (Fase 2 do [README](./README.md)) — invalidação de cache determinística elimina as races. Adicionar teste de regressão que trava o cenário.

### Teste de regressão (fica no repo)
- e2e: "cria 5 devedores e 5 empréstimos e todos aparecem corretamente, contadores do dashboard corretos".
- integração: `useCreateBorrower`/`useCreateLoan` chamados 5× seguidos → cache final tem 5 itens, sem duplicata.

## CI
- Adicionar workflow (GitHub Actions) rodando `lint` + `test:ci` (web e api) em cada PR.
- Bloquear merge com teste vermelho.

## Ordem de adoção
1. Configurar Vitest (web) e Jest (api) + 1 teste "smoke" cada (Fase 0).
2. Cobrir `loan-math` e services de cálculo (antes de mexer neles).
3. Escrever o e2e dos 5 cadastros que reproduz o bug **antes** de corrigir.
4. Migrar data-layer (Fase 2) e ver o teste ficar verde.
5. Ampliar cobertura por feature conforme refatora.

## Checklist
- [ ] Vitest + Testing Library + MSW no web; Jest + Supertest no api
- [ ] `loan-math` e helpers 100% cobertos
- [ ] Services de backend com unit tests
- [ ] e2e reproduzindo o bug dos 5 cadastros → depois verde
- [ ] Playwright do fluxo crítico
- [ ] CI rodando lint+test em PR
