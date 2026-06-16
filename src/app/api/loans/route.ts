import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const loans = await db.loan.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        borrower: true,
        installments: {
          orderBy: { installmentNumber: 'asc' },
        },
      },
    });
    return NextResponse.json(loans);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch loans' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { borrowerId, originalAmount, interestRate, installmentCount, startDate } = body;

    if (!borrowerId || !originalAmount || !interestRate || !installmentCount || !startDate) {
      return NextResponse.json({ error: 'Todos os campos são obrigatórios' }, { status: 400 });
    }

    // Calculate total with compound interest (Price table - fixed installments)
    const monthlyRate = interestRate / 100;
    const totalAmount = originalAmount * monthlyRate * Math.pow(1 + monthlyRate, installmentCount) / (Math.pow(1 + monthlyRate, installmentCount) - 1) * installmentCount;
    
    // Fixed installment value
    const installmentValue = totalAmount / installmentCount;

    // Generate installments
    const start = new Date(startDate);
    const installmentsData = [];
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
        borrowerId,
        originalAmount,
        interestRate,
        totalAmount: Math.round(totalAmount * 100) / 100,
        installmentCount,
        startDate: new Date(startDate),
        status: 'ACTIVE',
        installments: {
          create: installmentsData,
        },
      },
      include: {
        borrower: true,
        installments: {
          orderBy: { installmentNumber: 'asc' },
        },
      },
    });

    return NextResponse.json(loan, { status: 201 });
  } catch (error) {
    console.error('Loan creation error:', error);
    return NextResponse.json({ error: 'Failed to create loan' }, { status: 500 });
  }
}