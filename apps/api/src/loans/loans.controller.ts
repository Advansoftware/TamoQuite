import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { addPeriods, normalizeFrequency, parseDateOnly } from '../common/period.util';

@UseGuards(JwtAuthGuard)
@Controller('loans')
export class LoansController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@CurrentUser('id') userId: string) {
    return this.prisma.loan.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        borrower: true,
        installments: { orderBy: { installmentNumber: 'asc' } },
      },
    });
  }

  @Post()
  async create(
    @CurrentUser('id') userId: string,
    @Body()
    body: {
      borrowerId?: string;
      originalAmount?: number;
      interestRate?: number;
      installmentCount?: number;
      startDate?: string;
      frequency?: string;
    },
  ) {
    const { borrowerId, originalAmount, interestRate, installmentCount, startDate } = body;
    const frequency = normalizeFrequency(body.frequency);

    if (!borrowerId || !originalAmount || !interestRate || !installmentCount || !startDate) {
      throw new BadRequestException('Todos os campos são obrigatórios');
    }

    const borrower = await this.prisma.borrower.findFirst({ where: { id: borrowerId, userId } });
    if (!borrower) throw new NotFoundException('Devedor não encontrado');

    // Price table calculation — interestRate is the rate per installment period.
    const periodRate = interestRate / 100;
    const totalAmount =
      ((originalAmount * periodRate * Math.pow(1 + periodRate, installmentCount)) /
        (Math.pow(1 + periodRate, installmentCount) - 1)) *
      installmentCount;
    const installmentValue = totalAmount / installmentCount;

    // The date the user enters IS the first installment's due date; subsequent
    // installments fall one period after each other.
    const start = parseDateOnly(startDate);
    const installmentsData: {
      installmentNumber: number;
      dueDate: Date;
      amount: number;
      status: string;
    }[] = [];
    for (let i = 1; i <= installmentCount; i++) {
      installmentsData.push({
        installmentNumber: i,
        dueDate: addPeriods(start, frequency, i - 1),
        amount: Math.round(installmentValue * 100) / 100,
        status: 'PENDING',
      });
    }

    return this.prisma.loan.create({
      data: {
        userId,
        borrowerId,
        originalAmount,
        interestRate,
        totalAmount: Math.round(totalAmount * 100) / 100,
        installmentCount,
        startDate: parseDateOnly(startDate),
        paymentFrequency: frequency,
        status: 'ACTIVE',
        installments: { create: installmentsData },
      },
      include: {
        borrower: true,
        installments: { orderBy: { installmentNumber: 'asc' } },
      },
    });
  }

  @Get(':id')
  async get(@CurrentUser('id') userId: string, @Param('id') id: string) {
    const loan = await this.prisma.loan.findFirst({
      where: { id, userId },
      include: {
        borrower: true,
        installments: { orderBy: { installmentNumber: 'asc' } },
      },
    });
    if (!loan) throw new NotFoundException('Loan not found');
    return loan;
  }

  @Delete(':id')
  async remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    const result = await this.prisma.loan.deleteMany({ where: { id, userId } });
    if (result.count === 0) throw new NotFoundException('Not found');
    return { success: true };
  }

  // Per-contract billing override + "do not charge"
  @Put(':id/billing')
  async updateBilling(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body()
    body: {
      doNotCharge?: boolean;
      billingOverride?: boolean;
      whatsappMode?: string | null;
      remindBeforeEnabled?: boolean | null;
      daysBefore?: number | null;
      sendOnDueDate?: boolean | null;
      overdueEnabled?: boolean | null;
      overdueIntervalDays?: number | null;
    },
  ) {
    const loan = await this.prisma.loan.findFirst({ where: { id, userId } });
    if (!loan) throw new NotFoundException('Loan not found');

    const data: Record<string, unknown> = {};
    for (const key of [
      'doNotCharge',
      'billingOverride',
      'whatsappMode',
      'remindBeforeEnabled',
      'daysBefore',
      'sendOnDueDate',
      'overdueEnabled',
      'overdueIntervalDays',
    ] as const) {
      if (body[key] !== undefined) data[key] = body[key];
    }

    return this.prisma.loan.update({ where: { id }, data });
  }
}
