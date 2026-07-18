# Bugs conhecidos — investigação

## 🐞 "Bug dos 5 cadastros" (lista some/embaralha ao criar vários)

**Sintoma relatado:** criar ~5 cadastros seguidos "buga algo no fundo".

### Causa raiz (análise estática — confirmada no código)

O data layer do front é `fetch + useState + useEffect(setTimeout(0))` + `refreshKey` global no Zustand.
Exemplo em [`BorrowersView.tsx`](../../apps/web/src/components/loan-system/BorrowersView.tsx):

```ts
const fetchBorrowers = useCallback(async () => {
  const res = await apiFetch('/api/borrowers');   // (1) sem AbortController
  setBorrowers(await res.json());                  // (2) last-write-by-arrival
}, []);

useEffect(() => {
  const timer = setTimeout(() => fetchBorrowers(), 0);
  return () => clearTimeout(timer);                // (3) cancela o TIMER, não o fetch
}, [fetchBorrowers, refreshKey]);

const handleCreate = async () => {
  await apiPost('/api/borrowers', form);
  triggerRefresh();                                // (4) bump global de refreshKey
};
```

Problema (condição de corrida):
1. Cada criação chama `triggerRefresh()` → `refreshKey` muda → agenda novo refetch.
2. O `clearTimeout` só cancela o *timer* pendente; um `fetch` **já em andamento não é abortado**.
3. Com criações rápidas, dois GET `/api/borrowers` ficam em voo ao mesmo tempo.
4. As respostas podem chegar **fora de ordem**. Como o `setBorrowers` é "quem chegou por último vence", a resposta **mais antiga** (lista com menos itens) pode sobrescrever a mais nova → a UI "perde" cadastros. Intermitente e dependente de timing ("nunca vi").

Backend está correto: [`borrowers.controller.ts`](../../apps/api/src/borrowers/borrowers.controller.ts) retorna `_count` e `loans`, sem duplicação. O bug é **100% no front**.

O mesmo padrão (e o mesmo risco) está em `LoansView`, `BorrowerDetailView`, `AdminView`, `SettingsView`, `DashboardView`.

### Correção
Migrar o data layer para **React Query** (Fase 2 — ver [02-frontend.md](./02-frontend.md)):
- `useQuery` dedupa e associa a resposta à *query key* correta; respostas fora de ordem não corrompem o cache.
- Mutations (`useCreateBorrower`) fazem `invalidateQueries` → refetch determinístico, sem `refreshKey` nem `setTimeout(0)`.

### Teste de regressão (a escrever junto com a Fase 2)
- Integração (MSW + Testing Library): montar `BorrowersView`, criar 5 em sequência, garantir que a lista final tem os 5 (sem sumiço), inclusive simulando resposta lenta fora de ordem.
- e2e (Playwright, Fase 6): criar 5 pessoas + 5 empréstimos e conferir contadores do dashboard.

### Status
- [x] Causa raiz identificada (condição de corrida por falta de cancelamento/dedupe)
- [ ] Corrigir via React Query (Fase 2)
- [ ] Teste de regressão que trava o cenário
