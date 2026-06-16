import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, paidAmount } = body;

    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status;
    if (paidAmount !== undefined) {
      updateData.paidAmount = paidAmount;
    }
    if (status === 'PAID') {
      updateData.paidAt = new Date();
      const installment = await db.installment.findUnique({ where: { id } });
      if (installment && (!paidAmount || paidAmount <= 0)) {
        updateData.paidAmount = installment.amount;
      }
    }
    if (status === 'PARTIAL' && paidAmount !== undefined) {
      updateData.paidAt = new Date();
    }

    const installment = await db.installment.update({
      where: { id },
      data: updateData,
    });

    // Check if all installments are paid to update loan status
    if (status === 'PAID' || status === 'PARTIAL') {
      const loan = await db.loan.findUnique({
        where: { id: installment.loanId },
        include: { installments: true },
      });
      if (loan) {
        const allPaid = loan.installments.every(
          (inst) => inst.status === 'PAID' || inst.status === 'PARTIAL'
        );
        if (allPaid) {
          await db.loan.update({
            where: { id: loan.id },
            data: { status: 'COMPLETED' },
          });
        }
      }
    }

    return NextResponse.json(installment);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update installment' }, { status: 500 });
  }
}