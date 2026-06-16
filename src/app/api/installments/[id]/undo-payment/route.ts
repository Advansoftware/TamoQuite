import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/sessions';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = getSessionUserId(request);
  if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  try {
    const { id } = await params;

    const installment = await db.installment.findFirst({
      where: { id },
      include: { loan: true },
    });

    if (!installment || installment.loan.userId !== userId) {
      return NextResponse.json({ error: 'Parcela não encontrada' }, { status: 404 });
    }

    if (installment.status === 'PENDING') {
      return NextResponse.json({ error: 'Esta parcela não possui pagamento para desfazer' }, { status: 400 });
    }

    // Delete all partial payment records
    await db.partialPayment.deleteMany({
      where: { installmentId: id },
    });

    // Reset installment to original state
    await db.installment.update({
      where: { id },
      data: {
        status: 'PENDING',
        paidAmount: 0,
        paidAt: null,
      },
    });

    // Update loan status to ACTIVE
    await db.loan.update({
      where: { id: installment.loanId },
      data: { status: 'ACTIVE' },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in undo-payment:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
