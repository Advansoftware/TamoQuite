import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/sessions';

export async function GET(request: NextRequest) {
  const userId = getSessionUserId(request);
  if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  try {
    const loans = await db.loan.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        borrower: true,
        installments: { orderBy: { installmentNumber: 'asc' } },
      },
    });
    return NextResponse.json(loans);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch loans' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const userId = getSessionUserId(request);
  if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  try {
    const body = await request.json();
    const { borrowerId, originalAmount, interestRate, installmentCount, startDate } = body;

    if (!borrowerId || !originalAmount || !interestRate || !installmentCount || !startDate) {
      return NextResponse.json({ error: 'Todos os campos são obrigatórios' }, { status: 400 });
    }

    // Verify borrower belongs to user
    const borrower = await db.borrower.findFirst({ where: { id: borrowerId, userId } });
    if (!borrower) {
      return NextResponse.json({ error: 'Devedor não encontrado' }, { status: 404 });
    }

    // Price table calculation
    const monthlyRate = interestRate / 100;
    const totalAmount = originalAmount * monthlyRate * Math.pow(1 + monthlyRate, installmentCount) / (Math.pow(1 + monthlyRate, installmentCount) - 1) * installmentCount;
    const installmentValue = totalAmount / installmentCount;

    const start = new Date(startDate);
    const installmentsData: Array<{
      installmentNumber: number;
      dueDate: Date;
      amount: number;
      status: string;
    }> = [];
    for (let i = 1; i <= installmentCount; i++) {
      const dueDate = new Date(start);
      dueDate.setMonth(dueDate.getMonth() + i);
      installmentsData.push({
        installmentNumber: i,
        dueDate,
        amount: Math.round(installmentValue * 100) / 100,
        status: 'PENDING',
      });
    }

    const loan = await db.loan.create({
      data: {
        userId,
        borrowerId,
        originalAmount,
        interestRate,
        totalAmount: Math.round(totalAmount * 100) / 100,
        installmentCount,
        startDate: new Date(startDate),
        status: 'ACTIVE',
        installments: { create: installmentsData },
      },
      include: {
        borrower: true,
        installments: { orderBy: { installmentNumber: 'asc' } },
      },
    });

    return NextResponse.json(loan, { status: 201 });
  } catch (error) {
    console.error('Loan creation error:', error);
    return NextResponse.json({ error: 'Failed to create loan' }, { status: 500 });
  }
}