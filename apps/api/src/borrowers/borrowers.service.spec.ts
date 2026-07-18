import { describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { BorrowersService } from './borrowers.service';
import type { PrismaService } from '../prisma/prisma.service';

function makePrisma() {
  const store: { id: string; userId: string; name: string; whatsapp: string; notes: string | null }[] = [];
  let seq = 0;
  return {
    _store: store,
    borrower: {
      create: vi.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) => {
        const row = { id: `b${++seq}`, ...(data as object) } as (typeof store)[number];
        store.push(row);
        return Promise.resolve(row);
      }),
      updateMany: vi.fn().mockImplementation(({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const row = store.find((r) => r.id === where.id);
        if (!row) return Promise.resolve({ count: 0 });
        Object.assign(row, data);
        return Promise.resolve({ count: 1 });
      }),
      findUnique: vi.fn().mockImplementation(({ where }: { where: { id: string } }) =>
        Promise.resolve(store.find((r) => r.id === where.id) ?? null),
      ),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  } as unknown as PrismaService & { _store: typeof store };
}

describe('BorrowersService', () => {
  it('creates five distinct borrowers (backend companion to the 5-cadastros bug)', async () => {
    const prisma = makePrisma();
    const service = new BorrowersService(prisma);

    for (let i = 1; i <= 5; i++) {
      await service.create('u1', { name: `Pessoa ${i}`, whatsapp: `1198888000${i}` });
    }

    expect((prisma as unknown as { _store: unknown[] })._store).toHaveLength(5);
    expect(prisma.borrower.create).toHaveBeenCalledTimes(5);
  });

  it('strips non-digits from the whatsapp on create', async () => {
    const prisma = makePrisma();
    const service = new BorrowersService(prisma);

    await service.create('u1', { name: 'Zé', whatsapp: '(11) 98888-0001' });

    const arg = (prisma.borrower.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(arg.data.whatsapp).toBe('11988880001');
  });

  it('does not blank omitted fields on partial update', async () => {
    const prisma = makePrisma();
    const service = new BorrowersService(prisma);
    const created = await service.create('u1', { name: 'Ana', whatsapp: '11999990000', notes: 'ok' });

    // Update only the name; whatsapp/notes must survive.
    await service.update('u1', created.id, { name: 'Ana Maria' });

    const updateArg = (prisma.borrower.updateMany as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(updateArg.data).toEqual({ name: 'Ana Maria' });
    const row = (prisma as unknown as { _store: Array<{ whatsapp: string; notes: string | null }> })._store[0];
    expect(row.whatsapp).toBe('11999990000');
    expect(row.notes).toBe('ok');
  });

  it('throws NotFound when updating a borrower of another user', async () => {
    const prisma = makePrisma();
    const service = new BorrowersService(prisma);

    await expect(service.update('u1', 'missing', { name: 'X' })).rejects.toBeInstanceOf(NotFoundException);
  });
});
