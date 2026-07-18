import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// In-memory fake API. GET can be delayed to simulate out-of-order responses.
let db: Array<{ id: string; name: string }> = [];
let getDelay = 0;

vi.mock('@/lib/api', () => ({
  apiJson: vi.fn(async () => {
    const snapshot = [...db];
    if (getDelay > 0) await new Promise((r) => setTimeout(r, getDelay));
    return snapshot;
  }),
  apiPost: vi.fn(async (_url: string, body: { name: string }) => {
    db = [{ id: String(db.length + 1), name: body.name }, ...db];
    return new Response('{}');
  }),
  apiPut: vi.fn(async () => new Response('{}')),
  apiDelete: vi.fn(async () => new Response('{}')),
  resolveJson: vi.fn(async () => ({})),
}));

import { useBorrowers, useCreateBorrower } from './use-borrowers';

function wrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe('useBorrowers + useCreateBorrower', () => {
  beforeEach(() => {
    db = [];
    getDelay = 0;
  });

  it('criar 5 em sequência → a lista final tem os 5 (bug dos 5 cadastros)', async () => {
    const Wrapper = wrapper();
    const { result } = renderHook(
      () => ({ list: useBorrowers(), create: useCreateBorrower() }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.list.isSuccess).toBe(true));

    for (let i = 1; i <= 5; i++) {
      await act(async () => {
        await result.current.create.mutateAsync({ name: `Pessoa ${i}`, whatsapp: '11999999999' });
      });
    }

    await waitFor(() => expect(result.current.list.data).toHaveLength(5));
    expect(result.current.list.data?.map((b) => b.name)).toContain('Pessoa 5');
  });

  it('respostas fora de ordem não corrompem a lista', async () => {
    const Wrapper = wrapper();
    const { result } = renderHook(
      () => ({ list: useBorrowers(), create: useCreateBorrower() }),
      { wrapper: Wrapper },
    );
    await waitFor(() => expect(result.current.list.isSuccess).toBe(true));

    // Slow GET while we add items; React Query keys by query, so no stale overwrite.
    getDelay = 20;
    await act(async () => {
      await result.current.create.mutateAsync({ name: 'A', whatsapp: '11999999999' });
      await result.current.create.mutateAsync({ name: 'B', whatsapp: '11999999999' });
    });
    getDelay = 0;

    await waitFor(() => expect(result.current.list.data).toHaveLength(2));
  });
});
