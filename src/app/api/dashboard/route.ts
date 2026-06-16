import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Start and end of current month
    const monthStart = new Date(currentYear, currentMonth, 1);
    const monthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);

    // All installments with relations
    const allInstallments = await db.installment.findMany({
      include: {
        loan: {
          include: { borrower: true },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    // Update overdue statuses first
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    for (const inst of allInstallments) {
      if (inst.status === 'PENDING' && new Date(inst.dueDate) < todayStart) {
        await db.installment.update({
          where: { id: inst.id },
          data: { status: 'OVERDUE' },
        });
        inst.status = 'OVERDUE';
      }
    }

    // Monthly stats
    const monthlyInstallments = allInstallments.filter((inst) => {
      const due = new Date(inst.dueDate);
      return due >= monthStart && due <= monthEnd;
    });

    const totalMonthly = monthlyInstallments.reduce((sum, inst) => sum + inst.amount, 0);
    const receivedMonthly = monthlyInstallments
      .filter((inst) => inst.status === 'PAID' || inst.status === 'PARTIAL')
      .reduce((sum, inst) => sum + (inst.paidAmount || 0), 0);

    // Upcoming installments (next 15 days)
    const fifteenDaysFromNow = new Date(now);
    fifteenDaysFromNow.setDate(fifteenDaysFromNow.getDate() + 15);

    const upcomingInstallments = allInstallments
      .filter((inst) => {
        if (inst.status === 'PAID') return false;
        const due = new Date(inst.dueDate);
        return due <= fifteenDaysFromNow && due >= todayStart;
      })
      .slice(0, 10)
      .map((inst) => ({
        id: inst.id,
        installmentNumber: inst.installmentNumber,
        dueDate: inst.dueDate,
        amount: inst.amount,
        status: inst.status,
        paidAmount: inst.paidAmount,
        borrowerName: inst.loan.borrower.name,
        borrowerWhatsapp: inst.loan.borrower.whatsapp,
        loanId: inst.loanId,
      }));

    // Overdue installments
    const overdueInstallments = allInstallments
      .filter((inst) => inst.status === 'OVERDUE')
      .slice(0, 10)
      .map((inst) => ({
        id: inst.id,
        installmentNumber: inst.installmentNumber,
        dueDate: inst.dueDate,
        amount: inst.amount,
        status: inst.status,
        paidAmount: inst.paidAmount,
        borrowerName: inst.loan.borrower.name,
        borrowerWhatsapp: inst.loan.borrower.whatsapp,
        loanId: inst.loanId,
      }));

    // Total active loans
    const activeLoans = await db.loan.count({
      where: { status: 'ACTIVE' },
    });

    // Total outstanding
    const totalOutstanding = allInstallments
      .filter((inst) => inst.status === 'PENDING' || inst.status === 'OVERDUE')
      .reduce((sum, inst) => sum + (inst.amount - (inst.paidAmount || 0)), 0);

    // Recent loans
    const recentLoans = await db.loan.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        borrower: true,
        _count: {
          select: { installments: true },
        },
      },
    });

    return NextResponse.json({
      totalMonthly: Math.round(totalMonthly * 100) / 100,
      receivedMonthly: Math.round(receivedMonthly * 100) / 100,
      upcomingInstallments,
      overdueInstallments,
      overdueCount: overdueInstallments.length,
      activeLoans,
      totalOutstanding: Math.round(totalOutstanding * 100) / 100,
      recentLoans,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard' }, { status: 500 });
  }
}