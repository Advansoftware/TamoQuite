import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserId } from '@/lib/sessions';

export async function GET(request: NextRequest) {
  const userId = getSessionUserId(request);
  if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  try {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const monthStart = new Date(currentYear, currentMonth, 1);
    const monthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const allInstallments = await db.installment.findMany({
      include: { loan: { include: { borrower: true } } },
      orderBy: { dueDate: 'asc' },
      where: { loan: { userId } },
    });

    // Update overdue
    for (const inst of allInstallments) {
      if (inst.status === 'PENDING' && new Date(inst.dueDate) < todayStart) {
        await db.installment.update({ where: { id: inst.id }, data: { status: 'OVERDUE' } });
        inst.status = 'OVERDUE';
      }
    }

    const monthlyInsts = allInstallments.filter((i) => {
      const d = new Date(i.dueDate);
      return d >= monthStart && d <= monthEnd;
    });

    const totalMonthly = monthlyInsts.reduce((s, i) => s + i.amount, 0);

    const totalMonthlyPending = monthlyInsts
      .filter((i) => i.status !== 'PAID')
      .reduce((s, i) => s + (i.amount - (i.paidAmount || 0)), 0);

    const receivedMonthly = allInstallments
      .filter((i) => {
        if (!i.paidAt) return false;
        const d = new Date(i.paidAt);
        return d >= monthStart && d <= monthEnd;
      })
      .reduce((s, i) => s + (i.paidAmount || 0), 0);

    const fifteenDays = new Date(now);
    fifteenDays.setDate(fifteenDays.getDate() + 15);

    const upcoming = allInstallments
      .filter((i) => {
        if (i.status === 'PAID') return false;
        const d = new Date(i.dueDate);
        return d <= fifteenDays && d >= todayStart;
      })
      .slice(0, 10)
      .map((i) => ({
        id: i.id,
        installmentNumber: i.installmentNumber,
        dueDate: i.dueDate,
        amount: i.amount,
        status: i.status,
        paidAmount: i.paidAmount,
        borrowerName: i.loan.borrower.name,
        borrowerWhatsapp: i.loan.borrower.whatsapp,
        loanId: i.loanId,
      }));

    const overdue = allInstallments
      .filter((i) => i.status === 'OVERDUE')
      .slice(0, 10)
      .map((i) => ({
        id: i.id,
        installmentNumber: i.installmentNumber,
        dueDate: i.dueDate,
        amount: i.amount,
        status: i.status,
        paidAmount: i.paidAmount,
        borrowerName: i.loan.borrower.name,
        borrowerWhatsapp: i.loan.borrower.whatsapp,
        loanId: i.loanId,
      }));

    const activeLoans = await db.loan.count({ where: { userId, status: 'ACTIVE' } });
    const totalOutstanding = allInstallments
      .filter((i) => i.status !== 'PAID')
      .reduce((s, i) => s + (i.amount - (i.paidAmount || 0)), 0);

    const recentLoans = await db.loan.findMany({
      take: 5,
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        borrower: true,
        _count: { select: { installments: true } },
      },
    });

    return NextResponse.json({
      totalMonthly: Math.round(totalMonthly * 100) / 100,
      totalMonthlyPending: Math.round(totalMonthlyPending * 100) / 100,
      receivedMonthly: Math.round(receivedMonthly * 100) / 100,
      upcomingInstallments: upcoming,
      overdueInstallments: overdue,
      overdueCount: overdue.length,
      activeLoans,
      totalOutstanding: Math.round(totalOutstanding * 100) / 100,
      recentLoans,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard' }, { status: 500 });
  }
}