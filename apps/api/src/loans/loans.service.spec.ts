import { describe, expect, it, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
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

  it('stores the total the user asked for instead of re-deriving it from the rounded rate', async () => {
    const prisma = makePrisma();
    const service = new LoansService(prisma);

    // 200 → 250 over 3 periods is 8.333…% a period; capped at 8.33 the derived
    // total comes back 249,98. The explicit total has to win.
    await service.create('u1', {
      ...baseDto,
      originalAmount: 200,
      interestRate: 8.33,
      totalAmount: 250,
      installmentCount: 3,
    });

    const arg = (prisma.loan.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(arg.data.totalAmount).toBe(250);
  });

  it('parcelas add up to exactly the total when it does not divide evenly', async () => {
    const prisma = makePrisma();
    const service = new LoansService(prisma);

    await service.create('u1', { ...baseDto, totalAmount: 250, installmentCount: 3 });

    const arg = (prisma.loan.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const rows = arg.data.installments.create as { amount: number }[];
    expect(rows.map((r) => r.amount)).toEqual([83.34, 83.33, 83.33]);
    expect(Math.round(rows.reduce((s, r) => s + r.amount, 0) * 100) / 100).toBe(250);
  });

  it('uses the due dates the user set instead of the periodic schedule', async () => {
    const prisma = makePrisma();
    const service = new LoansService(prisma);

    await service.create('u1', {
      ...baseDto,
      installmentCount: 3,
      dueDates: ['2026-01-05', '2026-02-20', '2026-03-01'],
    });

    const arg = (prisma.loan.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const rows = arg.data.installments.create as { dueDate: Date }[];
    expect(rows.map((r) => r.dueDate.toISOString().split('T')[0])).toEqual([
      '2026-01-05',
      '2026-02-20',
      '2026-03-01',
    ]);
    // The contract's start date follows the first installment the user set.
    expect(arg.data.startDate.toISOString().split('T')[0]).toBe('2026-01-05');
  });

  it('rejects a due date list that does not match the installment count', async () => {
    const prisma = makePrisma();
    const service = new LoansService(prisma);

    await expect(
      service.create('u1', { ...baseDto, installmentCount: 3, dueDates: ['2026-01-05'] }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.loan.create).not.toHaveBeenCalled();
  });
});

describe('LoansService.list — visibilidade', () => {
  it('hides contracts of deleted loans and of deactivated clients', async () => {
    const prisma = makePrisma();
    (prisma.loan.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const service = new LoansService(prisma);

    await service.list('u1');

    const where = (prisma.loan.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0].where;
    expect(where.deletedAt).toBeNull();
    // Filtering through the relation is what makes reactivating a client
    // restore every contract without any unwind step.
    expect(where.borrower).toEqual({ isActive: true });
  });

  it('still opens a single contract of a deactivated client (reachable from their page)', async () => {
    const prisma = makePrisma();
    (prisma.loan.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'loan1' });
    const service = new LoansService(prisma);

    await service.get('u1', 'loan1');

    const where = (prisma.loan.findFirst as ReturnType<typeof vi.fn>).mock.calls[0][0].where;
    expect(where.deletedAt).toBeNull();
    expect(where.borrower).toBeUndefined();
  });
});

describe('LoansService.remove — exclusão (soft delete)', () => {
  function makeDeletePrisma(loan: unknown) {
    return {
      loan: { findFirst: vi.fn().mockResolvedValue(loan), update: vi.fn() },
      loanShare: { updateMany: vi.fn() },
      outboundMessage: { updateMany: vi.fn() },
      chargeLog: { findMany: vi.fn().mockResolvedValue([{ id: 'cl1' }]) },
      $transaction: vi.fn().mockResolvedValue([]),
    } as unknown as PrismaService;
  }

  it('marks the contract deleted, kills the share link and drops queued charges', async () => {
    const prisma = makeDeletePrisma({ id: 'loan1', userId: 'u1', canceledAt: null });
    const service = new LoansService(prisma);

    await service.remove('u1', 'loan1');

    const updateArg = (prisma.loan.update as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(updateArg.data.deletedAt).toBeInstanceOf(Date);
    expect(prisma.loanShare.updateMany).toHaveBeenCalled();
    expect(prisma.outboundMessage.updateMany).toHaveBeenCalled();
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('will not delete a contract belonging to someone else', async () => {
    const prisma = makeDeletePrisma(null);
    const service = new LoansService(prisma);

    await expect(service.remove('u1', 'loan1')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.loan.update).not.toHaveBeenCalled();
  });
});

describe('LoansService.update — correção de contrato', () => {
  function pending(n: number) {
    return Array.from({ length: n }, (_v, idx) => ({
      id: `i${idx + 1}`,
      installmentNumber: idx + 1,
      amount: 110,
      status: 'PENDING',
      paidAmount: 0,
    }));
  }

  function makeUpdatePrisma(loan: unknown) {
    return {
      borrower: { findFirst: vi.fn().mockResolvedValue({ id: 'b2', userId: 'u1' }) },
      loan: { findFirst: vi.fn().mockResolvedValue(loan), update: vi.fn() },
      installment: { update: vi.fn(), createMany: vi.fn(), deleteMany: vi.fn() },
      $transaction: vi.fn().mockResolvedValue([]),
    } as unknown as PrismaService;
  }

  const baseLoan = {
    id: 'loan1',
    userId: 'u1',
    borrowerId: 'b1',
    originalAmount: 200,
    interestRate: 5,
    totalAmount: 220,
    installmentCount: 2,
    startDate: new Date(Date.UTC(2026, 0, 10, 12)),
    paymentFrequency: 'MONTHLY',
    installments: pending(2),
  };

  it('recalcula o total quando o valor original muda (500 @ 5% x 2 = R$550)', async () => {
    const prisma = makeUpdatePrisma(baseLoan);
    const service = new LoansService(prisma);

    await service.update('u1', 'loan1', { originalAmount: 500 });

    const data = (prisma.loan.update as ReturnType<typeof vi.fn>).mock.calls[0][0].data;
    expect(data.originalAmount).toBe(500);
    expect(data.totalAmount).toBe(550);
    // Both parcelas reused (same ids), corrected to 275 each.
    const updates = (prisma.installment.update as ReturnType<typeof vi.fn>).mock.calls;
    expect(updates.map((c) => c[0].where.id)).toEqual(['i1', 'i2']);
    expect(updates.map((c) => c[0].data.amount)).toEqual([275, 275]);
  });

  it('um total informado explicitamente vence o derivado da taxa', async () => {
    const prisma = makeUpdatePrisma(baseLoan);
    const service = new LoansService(prisma);

    await service.update('u1', 'loan1', { originalAmount: 200, totalAmount: 250, installmentCount: 3 });

    const data = (prisma.loan.update as ReturnType<typeof vi.fn>).mock.calls[0][0].data;
    expect(data.totalAmount).toBe(250);
    // 250 em 3x: os centavos sobram para a primeira parcela.
    const amounts = (prisma.installment.update as ReturnType<typeof vi.fn>).mock.calls.map(
      (c) => c[0].data.amount,
    );
    expect(amounts).toEqual([83.34, 83.33]);
    // A 3ª parcela não existia, então é criada.
    const created = (prisma.installment.createMany as ReturnType<typeof vi.fn>).mock.calls[0][0].data;
    expect(created).toHaveLength(1);
    expect(created[0].amount).toBe(83.33);
    expect(created[0].installmentNumber).toBe(3);
  });

  it('remove as parcelas que sobram quando o parcelamento diminui', async () => {
    const prisma = makeUpdatePrisma({ ...baseLoan, installmentCount: 3, installments: pending(3) });
    const service = new LoansService(prisma);

    await service.update('u1', 'loan1', { installmentCount: 2 });

    const del = (prisma.installment.deleteMany as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(del.where.id.in).toEqual(['i3']);
    expect(prisma.installment.createMany).not.toHaveBeenCalled();
  });

  it('aceita vencimentos informados um a um', async () => {
    const prisma = makeUpdatePrisma(baseLoan);
    const service = new LoansService(prisma);

    await service.update('u1', 'loan1', { dueDates: ['2026-03-05', '2026-04-20'] });

    const dates = (prisma.installment.update as ReturnType<typeof vi.fn>).mock.calls.map(
      (c) => c[0].data.dueDate as Date,
    );
    expect(dates[0].getUTCMonth()).toBe(2); // Mar
    expect(dates[0].getUTCDate()).toBe(5);
    expect(dates[1].getUTCDate()).toBe(20);
  });

  it('recusa datas que não batem com o número de parcelas', async () => {
    const prisma = makeUpdatePrisma(baseLoan);
    const service = new LoansService(prisma);

    await expect(
      service.update('u1', 'loan1', { installmentCount: 3, dueDates: ['2026-03-05'] }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('recusa mexer no dinheiro depois que uma parcela foi paga', async () => {
    const paid = [{ ...pending(1)[0], status: 'PAID', paidAmount: 110 }, pending(2)[1]];
    const prisma = makeUpdatePrisma({ ...baseLoan, installments: paid });
    const service = new LoansService(prisma);

    await expect(service.update('u1', 'loan1', { originalAmount: 500 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('recusa mexer no dinheiro com pagamento apenas parcial', async () => {
    const partial = [{ ...pending(1)[0], status: 'PARTIAL', paidAmount: 40 }, pending(2)[1]];
    const prisma = makeUpdatePrisma({ ...baseLoan, installments: partial });
    const service = new LoansService(prisma);

    await expect(service.update('u1', 'loan1', { installmentCount: 4 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('trocar o cliente continua liberado mesmo com parcela paga (não mexe no cronograma)', async () => {
    const paid = [{ ...pending(1)[0], status: 'PAID', paidAmount: 110 }, pending(2)[1]];
    const prisma = makeUpdatePrisma({ ...baseLoan, installments: paid });
    (prisma.loan.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseLoan,
      installments: paid,
    });
    const service = new LoansService(prisma);

    await service.update('u1', 'loan1', { borrowerId: 'b2' });

    const data = (prisma.loan.update as ReturnType<typeof vi.fn>).mock.calls[0][0].data;
    expect(data.borrowerId).toBe('b2');
    expect(data.totalAmount).toBeUndefined();
  });

  it('não edita contrato de outra pessoa', async () => {
    const prisma = makeUpdatePrisma(null);
    const service = new LoansService(prisma);

    await expect(service.update('u1', 'loan1', { originalAmount: 1 })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
