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

    // Get the interest installment
    const interestInstallment = await db.installment.findFirst({
      where: { id },
      include: { loan: { include: { installments: true } } },
    });

    if (!interestInstallment || interestInstallment.loan.userId !== userId) {
      return NextResponse.json({ error: 'Parcela de juros não encontrada' }, { status: 404 });
    }

    // A parcela original empurrada deve ser a que tem installmentNumber = interestInstallment.installmentNumber + 1
    const nextInstallment = interestInstallment.loan.installments.find(
      (inst) => inst.installmentNumber === interestInstallment.installmentNumber + 1
    );

    if (!nextInstallment) {
      return NextResponse.json({ error: 'Parcela original correspondente não encontrada' }, { status: 400 });
    }

    // 1. Restaurar a data e o installmentNumber da próxima parcela para o mês anterior
    //    NÃO sobrescrever status/paidAmount/paidAt — manter o estado original da parcela
    const prevDueDate = new Date(nextInstallment.dueDate);
    prevDueDate.setMonth(prevDueDate.getMonth() - 1);

    await db.installment.update({
      where: { id: nextInstallment.id },
      data: {
        dueDate: prevDueDate,
        installmentNumber: interestInstallment.installmentNumber,
      },
    });

    // 2. Trazer as outras parcelas subsequentes de volta por 1 mês
    const subsequentInstallments = interestInstallment.loan.installments.filter(
      (inst) => inst.installmentNumber > nextInstallment.installmentNumber
    );

    for (const inst of subsequentInstallments) {
      const prevDate = new Date(inst.dueDate);
      prevDate.setMonth(prevDate.getMonth() - 1);

      await db.installment.update({
        where: { id: inst.id },
        data: {
          installmentNumber: inst.installmentNumber - 1,
          dueDate: prevDate,
        },
      });
    }

    // 3. Excluir a parcela temporária de juro
    await db.installment.delete({
      where: { id },
    });

    // 4. Garantir que o empréstimo volte para o status ACTIVE
    await db.loan.update({
      where: { id: interestInstallment.loanId },
      data: { status: 'ACTIVE' },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in undo-roll:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
