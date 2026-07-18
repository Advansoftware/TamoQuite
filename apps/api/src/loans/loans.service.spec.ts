import { describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { LoansService } from './loans.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { CreateLoanDto } from './dto/create-loan.dto';

function makePrisma(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    borrower: { findFirst: vi.fn().mockResolvedValue({ id: 'b1', userId: 'u1' }) },
    loan: {
      create: vi.fn().mockImplementation(({ data }: { data: unknown }) => Promise.resolve({ id: 'loan1', ...(data as object) })),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      deleteMany: vi.fn(),
      update: vi.fn(),
    },
    ...overrides,
  } as unknown as PrismaService;
}

const baseDto: CreateLoanDto = {
  borrowerId: 'b1',
  originalAmount: 200,
  interestRate: 5,
  installmentCount: 2,
  startDate: '2026-01-10',
  frequency: 'MONTHLY',
};

describe('LoansService.create', () => {
  it('applies simple interest on the principal (200 @ 5% x 2 = R$220, 110/parcela)', async () => {
    const prisma = makePrisma();
    const service = new LoansService(prisma);

    await service.create('u1', baseDto);

    const arg = (prisma.loan.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(arg.data.totalAmount).toBe(220);
    expect(arg.data.installmentCount).toBe(2);
    expect(arg.data.installments.create).toHaveLength(2);
    expect(arg.data.installments.create.every((i: { amount: number }) => i.amount === 110)).toBe(true);
  });

  it('numbers installments 1..n and spaces due dates one period apart', async () => {
    const prisma = makePrisma();
    const service = new LoansService(prisma);

    await service.create('u1', { ...baseDto, installmentCount: 3 });

    const arg = (prisma.loan.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const rows = arg.data.installments.create as { installmentNumber: number; dueDate: Date }[];
    expect(rows.map((r) => r.installmentNumber)).toEqual([1, 2, 3]);
    // First due date is the entered start date; the third is two months later.
    expect(rows[0].dueDate.getUTCMonth()).toBe(0); // Jan
    expect(rows[2].dueDate.getUTCMonth()).toBe(2); // Mar
  });

  it('treats a single "à vista" loan with no interest as receive = principal', async () => {
    const prisma = makePrisma();
    const service = new LoansService(prisma);

    await service.create('u1', { ...baseDto, installmentCount: 1, interestRate: undefined });

    const arg = (prisma.loan.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(arg.data.totalAmount).toBe(200);
    expect(arg.data.installments.create).toHaveLength(1);
    expect(arg.data.installments.create[0].amount).toBe(200);
  });

  it('rejects a borrower that does not belong to the user', async () => {
    const prisma = makePrisma({ borrower: { findFirst: vi.fn().mockResolvedValue(null) } });
    const service = new LoansService(prisma);

    await expect(service.create('u1', baseDto)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.loan.create).not.toHaveBeenCalled();
  });
});
