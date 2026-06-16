import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/sessions';

export async function GET(
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

    const payments = await db.partialPayment.findMany({
      where: { installmentId: id },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(payments);
  } catch (error) {
    console.error('Error fetching partial payments:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = getSessionUserId(request);
  if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  try {
    const { id } = await params;
    const body = await request.json();
    const { amount, note } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Valor inválido' }, { status: 400 });
    }

    const installment = await db.installment.findFirst({
      where: { id },
      include: { loan: true },
    });

    if (!installment || installment.loan.userId !== userId) {
      return NextResponse.json({ error: 'Parcela não encontrada' }, { status: 404 });
    }

    if (installment.status === 'PAID') {
      return NextResponse.json({ error: 'Esta parcela já está quitada' }, { status: 400 });
    }

    const currentPaid = installment.paidAmount || 0;
    if (currentPaid + amount > installment.amount) {
      return NextResponse.json({ error: 'Valor excede o restante da parcela' }, { status: 400 });
    }

    // Create partial payment record
    const payment = await db.partialPayment.create({
      data: {
        installmentId: id,
        amount,
        note: note || null,
      },
    });

    // Update installment paidAmount and status
    const newPaidAmount = currentPaid + amount;
    const newStatus = newPaidAmount >= installment.amount ? 'PAID' : 'PARTIAL';

    await db.installment.update({
      where: { id },
      data: {
        paidAmount: newPaidAmount,
        status: newStatus,
        paidAt: new Date(),
      },
    });

    // Update loan status
    const loan = await db.loan.findUnique({
      where: { id: installment.loanId },
      include: { installments: true },
    });
    if (loan) {
      const allDone = loan.installments.every((i) => i.status === 'PAID');
      await db.loan.update({
        where: { id: loan.id },
        data: { status: allDone ? 'COMPLETED' : 'ACTIVE' },
      });
    }

    return NextResponse.json(payment);
  } catch (error) {
    console.error('Error creating partial payment:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
