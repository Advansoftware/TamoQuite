# 02 — Arquitetura Frontend (Next.js)

> Meta: data-fetching consistente, hooks de domínio, componentes pequenos. Padrão único.

## Problema central: data layer inconsistente

- React Query só é usado em `LoanDetailView.tsx`. Todo o resto faz `fetch + useState + useEffect`.
- Para driblar a regra de lint `set-state-in-effect`, há `setTimeout(() => fetch(), 0)` em quase todo componente (`BorrowersView`, `LoansView`, `BorrowerDetailView`, `AdminView`, `SettingsView`, `NotificationBell`, `CreateLoanDialog`…). É um cheiro forte.
- Estado global usa `refreshKey` no Zustand para forçar refetch manual — React Query resolve isso com invalidação de cache.
- **Suspeita do "bug dos 5 cadastros"**: race entre `setTimeout(0)` + `refreshKey` + refetch manual (lista não atualiza, duplica ou pisca). Ver [05-testing.md](./05-testing.md).

## Padrão-alvo: React Query em tudo + hooks de domínio

### 1. Camada de API + query keys
`lib/api.ts` já existe (bom). Adicionar:
- `lib/query-keys.ts` — fábrica central de chaves:
  ```ts
  export const qk = {
    loans: ['loans'] as const,
    loan: (id: string) => ['loans', id] as const,
    borrowers: ['borrowers'] as const,
    borrower: (id: string) => ['borrowers', id] as const,
    dashboard: ['dashboard'] as const,
    subscription: ['subscription'] as const,
    me: ['me'] as const,
  };
  ```
- Um helper `apiJson<T>(url)` que já faz `getApiError` + `res.json()` tipado.

### 2. Hooks de domínio em `features/<domínio>/`
Exemplos:
```ts
// features/loans/use-loans.ts
export function useLoans() {
  return useQuery({ queryKey: qk.loans, queryFn: () => apiJson<Loan[]>('/api/loans') });
}
export function useCreateLoan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateLoanDto) => apiPostJson('/api/loans', dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.loans });
      qc.invalidateQueries({ queryKey: qk.dashboard });
    },
  });
}
```
Regras:
- Componente **nunca** chama `fetch`/`apiFetch` direto — só usa hook.
- Invalidação de cache substitui `refreshKey`/`triggerRefresh` (remover do store).
- `staleTime` sensato por recurso (já há default de 30s em `providers.tsx`).

### 3. Remover as gambiarras
- Apagar `refreshKey`, `triggerRefresh` do `store.ts` (Zustand fica só com **auth**).
- Remover todos os `setTimeout(() => fetch(), 0)` (não precisam mais — React Query busca no mount sem setState-in-effect).
- Padronizar loading/erro via estados do React Query (`isLoading`, `isError`).

## Decomposição dos monólitos

Mover de `components/loan-system/*` para `features/<domínio>/`:

| Arquivo hoje | Quebrar em |
|---|---|
| `LoanDetailView.tsx` (808) | `LoanHeader`, `InstallmentList`, `InstallmentRow`, dialogs (`PayFullDialog`, `PartialPaymentDialog`, `InterestDialog`, `RollDialog`) + hooks `use-loan`, `use-installment-actions` |
| `SettingsView.tsx` (920) | `SettingsWhatsapp`, `SettingsTemplates`, `SettingsSubscription`, `AdminWhatsappPool` + hooks |
| `CreateLoanDialog.tsx` (633) | `LoanForm` (essencial), `LoanFormAdvanced`, `BorrowerCombobox`, `CreateBorrowerDialog` + `use-loan-calculator` (cálculo puro, testável) |
| `AdminView.tsx` (519) | `UserList`, `UserRow`, `CouponManager`, `ApplyCouponDialog` + hooks |
| `BorrowerDetailView.tsx` (389) | `BorrowerHeader`, `ConsolidatedChargeCard`, `LoanMiniCard` |

Diretriz: **componente de apresentação puro** (recebe props, sem fetch) + **container/hook** que traz dados.

## Lógica pura → funções testáveis
- Extrair o cálculo de empréstimo (juros simples, à vista, por total) para `features/loans/loan-math.ts` com testes unitários (é dinheiro, tem que ter teste).
- Mesma coisa para helpers de data/telefone (já em `lib/helpers.ts`, `lib/phone.ts` — cobrir com testes).

## Tipos compartilhados
- Hoje cada componente redefine `interface Loan`, `Installment`, etc. Criar `features/<domínio>/types.ts` como fonte única.
- Avaliar gerar tipos a partir do Prisma/OpenAPI no futuro (fase posterior, opcional).

## Convenções
- `'use client'` só onde precisa; páginas do App Router orquestram, features encapsulam.
- Nome de arquivos: `kebab-case.ts` para hooks/utils, `PascalCase.tsx` para componentes.
- Sem lógica de negócio em componente; sem `fetch` em componente; sem `setTimeout(0)`.

## Checklist
- [ ] `lib/query-keys.ts` + `apiJson` helpers
- [ ] Hooks de domínio para loans, borrowers, dashboard, subscription, billing settings
- [ ] Migrar cada view para os hooks; remover fetch manual e `setTimeout(0)`
- [ ] Remover `refreshKey`/`triggerRefresh` do store
- [ ] Quebrar os 5 monólitos em `features/`
- [ ] Extrair `loan-math.ts` com testes
- [ ] Tipos únicos por domínio
