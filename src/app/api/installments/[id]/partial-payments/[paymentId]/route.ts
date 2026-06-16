import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/sessions';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; paymentId: string }> }
) {
  const userId = getSessionUserId(request);
  if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  try {
    const { id, paymentId } = await params;

    const installment = await db.installment.findFirst({
      where: { id },
      include: { loan: true },
    });

    if (!installment || installment.loan.userId !== userId) {
      return NextResponse.json({ error: 'Parcela não encontrada' }, { status: 404 });
    }

    const payment = await db.partialPayment.findFirst({
      where: { id: paymentId, installmentId: id },
    });

    if (!payment) {
      return NextResponse.json({ error: 'Pagamento não encontrado' }, { status: 404 });
    }

    // Delete the partial payment
    await db.partialPayment.delete({
      where: { id: paymentId },
    });

    // Update installment paidAmount
    const newPaidAmount = Math.max(0, (installment.paidAmount || 0) - payment.amount);
    const newStatus = newPaidAmount <= 0 ? 'PENDING' : 'PARTIAL';

    await db.installment.update({
      where: { id },
      data: {
        paidAmount: newPaidAmount,
        status: newStatus,
        paidAt: newPaidAmount > 0 ? new Date() : null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting partial payment:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
