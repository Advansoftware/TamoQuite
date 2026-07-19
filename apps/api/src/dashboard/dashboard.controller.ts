import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { SubscriptionGuard } from '../common/subscription.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

@UseGuards(JwtAuthGuard, SubscriptionGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async get(@CurrentUser('id') userId: string) {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const monthStart = new Date(currentYear, currentMonth, 1);
    const monthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const allInstallments = await this.prisma.installment.findMany({
      include: { loan: { include: { borrower: true } } },
      orderBy: { dueDate: 'asc' },
      // Deleted contracts contribute nothing: not to the month's total, not to
      // what's overdue, not to the outstanding balance.
      where: { loan: { userId, deletedAt: null } },
    });

    // Update overdue
    for (const inst of allInstallments) {
      if (inst.status === 'PENDING' && new Date(inst.dueDate) < todayStart) {
        await this.prisma.installment.update({ where: { id: inst.id }, data: { status: 'OVERDUE' } });
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

    const activeLoans = await this.prisma.loan.count({
      where: { userId, status: 'ACTIVE', deletedAt: null },
    });
    const totalOutstanding = allInstallments
      .filter((i) => i.status !== 'PAID')
      .reduce((s, i) => s + (i.amount - (i.paidAmount || 0)), 0);

    const recentLoansRaw = await this.prisma.loan.findMany({
      take: 5,
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { borrower: true, installments: true },
    });

    const recentLoans = recentLoansRaw.map((loan) => {
      const dynamicTotal = loan.installments.reduce((sum, i) => sum + i.amount, 0);
      const paidAmount = loan.installments.reduce((sum, i) => sum + (i.paidAmount || 0), 0);
      const remainingAmount = dynamicTotal - paidAmount;
      return {
        id: loan.id,
        originalAmount: loan.originalAmount,
        totalAmount: Math.round(dynamicTotal * 100) / 100,
        remainingAmount: Math.round(remainingAmount * 100) / 100,
        status: loan.status,
        createdAt: loan.createdAt.toISOString(),
        borrower: { name: loan.borrower.name, whatsapp: loan.borrower.whatsapp },
        _count: { installments: loan.installments.length },
      };
    });

    return {
      totalMonthly: Math.round(totalMonthly * 100) / 100,
      totalMonthlyPending: Math.round(totalMonthlyPending * 100) / 100,
      receivedMonthly: Math.round(receivedMonthly * 100) / 100,
      upcomingInstallments: upcoming,
      overdueInstallments: overdue,
      overdueCount: overdue.length,
      activeLoans,
      totalOutstanding: Math.round(totalOutstanding * 100) / 100,
      recentLoans,
    };
  }
}
