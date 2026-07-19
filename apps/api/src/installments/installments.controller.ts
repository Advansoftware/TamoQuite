import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { SubscriptionGuard } from '../common/subscription.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { addPeriods, parseDateOnly } from '../common/period.util';

@UseGuards(JwtAuthGuard, SubscriptionGuard)
@Controller('installments')
export class InstallmentsController {
  constructor(private readonly prisma: PrismaService) {}

  private async findOwned(userId: string, id: string, includeLoanInstallments = false) {
    const installment = await this.prisma.installment.findFirst({
      // Parcelas of a deleted contract no longer exist as far as the app is
      // concerned — they can't be read, paid or charged.
      where: { id, loan: { deletedAt: null } },
      include: {
        loan: includeLoanInstallments ? { include: { installments: true } } : true,
      },
    });
    if (!installment || installment.loan.userId !== userId) {
      throw new NotFoundException('Parcela não encontrada');
    }
    return installment;
  }

  @Put(':id')
  async update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() body: { status?: string; paidAmount?: number },
  ) {
    const installment = await this.findOwned(userId, id);
    const { status, paidAmount } = body;

    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status;
    if (paidAmount !== undefined) updateData.paidAmount = paidAmount;
    if (status === 'PAID') {
      updateData.paidAt = new Date();
      if (!paidAmount || paidAmount <= 0) {
        updateData.paidAmount = installment.amount;
      }
    }
    if (status === 'PARTIAL' && paidAmount !== undefined) {
      updateData.paidAt = new Date();
    }

    const updated = await this.prisma.installment.update({ where: { id }, data: updateData });

    const loan = await this.prisma.loan.findUnique({
      where: { id: installment.loanId },
      include: { installments: true },
    });
    if (loan) {
      const allDone = loan.installments.every((inst) => inst.status === 'PAID');
      await this.prisma.loan.update({
        where: { id: loan.id },
        data: { status: allDone ? 'COMPLETED' : 'ACTIVE' },
      });
    }

    return updated;
  }

  @Get(':id/partial-payments')
  async listPartial(@CurrentUser('id') userId: string, @Param('id') id: string) {
    await this.findOwned(userId, id);
    return this.prisma.partialPayment.findMany({
      where: { installmentId: id },
      orderBy: { createdAt: 'asc' },
    });
  }

  @Post(':id/partial-payments')
  async createPartial(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() body: { amount?: number; note?: string },
  ) {
    const { amount, note } = body;
    if (!amount || amount <= 0) throw new BadRequestException('Valor inválido');

    const installment = await this.findOwned(userId, id);
    if (installment.status === 'PAID') {
      throw new BadRequestException('Esta parcela já está quitada');
    }

    const currentPaid = installment.paidAmount || 0;
    if (currentPaid + amount > installment.amount) {
      throw new BadRequestException('Valor excede o restante da parcela');
    }

    const payment = await this.prisma.partialPayment.create({
      data: { installmentId: id, amount, note: note || null },
    });

    const newPaidAmount = currentPaid + amount;
    const newStatus = newPaidAmount >= installment.amount ? 'PAID' : 'PARTIAL';

    await this.prisma.installment.update({
      where: { id },
      data: { paidAmount: newPaidAmount, status: newStatus, paidAt: new Date() },
    });

    const loan = await this.prisma.loan.findUnique({
      where: { id: installment.loanId },
      include: { installments: true },
    });
    if (loan) {
      const allDone = loan.installments.every((i) => i.status === 'PAID');
      await this.prisma.loan.update({
        where: { id: loan.id },
        data: { status: allDone ? 'COMPLETED' : 'ACTIVE' },
      });
    }

    return payment;
  }

  @Delete(':id/partial-payments/:paymentId')
  async deletePartial(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Param('paymentId') paymentId: string,
  ) {
    const installment = await this.findOwned(userId, id);

    const payment = await this.prisma.partialPayment.findFirst({
      where: { id: paymentId, installmentId: id },
    });
    if (!payment) throw new NotFoundException('Pagamento não encontrado');

    await this.prisma.partialPayment.delete({ where: { id: paymentId } });

    const newPaidAmount = Math.max(0, (installment.paidAmount || 0) - payment.amount);
    const newStatus = newPaidAmount <= 0 ? 'PENDING' : 'PARTIAL';

    await this.prisma.installment.update({
      where: { id },
      data: {
        paidAmount: newPaidAmount,
        status: newStatus,
        paidAt: newPaidAmount > 0 ? new Date() : null,
      },
    });

    return { success: true };
  }

  @Post(':id/roll-remaining')
  async rollRemaining(@CurrentUser('id') userId: string, @Param('id') id: string) {
    const installment = await this.findOwned(userId, id, true);

    if (installment.status !== 'PARTIAL') {
      throw new BadRequestException('Apenas parcelas parciais podem ser roladas');
    }

    const paidInterest = installment.paidAmount;

    await this.prisma.installment.create({
      data: {
        loanId: installment.loanId,
        installmentNumber: installment.installmentNumber,
        dueDate: installment.dueDate,
        amount: paidInterest,
        status: 'PAID',
        paidAmount: paidInterest,
        paidAt: installment.paidAt || new Date(),
        type: 'INTEREST',
      },
    });

    const loanWithInstallments = installment.loan as typeof installment.loan & {
      installments: { id: string; installmentNumber: number; dueDate: Date }[];
    };
    const freq = installment.loan.paymentFrequency;
    const installmentsToMove = loanWithInstallments.installments.filter(
      (inst) => inst.installmentNumber >= installment.installmentNumber,
    );

    for (const inst of installmentsToMove) {
      const nextDueDate = addPeriods(inst.dueDate, freq, 1);

      if (inst.id === installment.id) {
        await this.prisma.installment.update({
          where: { id: inst.id },
          data: {
            installmentNumber: inst.installmentNumber + 1,
            dueDate: nextDueDate,
            status: 'PENDING',
            paidAmount: 0,
            paidAt: null,
          },
        });
      } else {
        await this.prisma.installment.update({
          where: { id: inst.id },
          data: { installmentNumber: inst.installmentNumber + 1, dueDate: nextDueDate },
        });
      }
    }

    await this.prisma.loan.update({ where: { id: installment.loanId }, data: { status: 'ACTIVE' } });
    return { success: true };
  }

  @Post(':id/undo-payment')
  async undoPayment(@CurrentUser('id') userId: string, @Param('id') id: string) {
    const installment = await this.findOwned(userId, id);
    if (installment.status === 'PENDING') {
      throw new BadRequestException('Esta parcela não possui pagamento para desfazer');
    }

    await this.prisma.partialPayment.deleteMany({ where: { installmentId: id } });
    await this.prisma.installment.update({
      where: { id },
      data: { status: 'PENDING', paidAmount: 0, paidAt: null },
    });
    await this.prisma.loan.update({ where: { id: installment.loanId }, data: { status: 'ACTIVE' } });
    return { success: true };
  }

  @Post(':id/undo-roll')
  async undoRoll(@CurrentUser('id') userId: string, @Param('id') id: string) {
    const interestInstallment = await this.findOwned(userId, id, true);
    if (interestInstallment.type !== 'INTEREST') {
      throw new BadRequestException('Esta não é uma parcela temporária de juros');
    }

    const loanWithInstallments = interestInstallment.loan as typeof interestInstallment.loan & {
      installments: {
        id: string;
        installmentNumber: number;
        dueDate: Date;
        status: string;
        paidAmount: number;
      }[];
    };

    const nextInstallment = loanWithInstallments.installments.find(
      (inst) => inst.installmentNumber === interestInstallment.installmentNumber + 1,
    );
    if (!nextInstallment) {
      throw new BadRequestException('Parcela original correspondente não encontrada');
    }

    const freq = interestInstallment.loan.paymentFrequency;
    const prevDueDate = addPeriods(nextInstallment.dueDate, freq, -1);

    const restoreData: Record<string, unknown> = {
      dueDate: prevDueDate,
      installmentNumber: interestInstallment.installmentNumber,
    };

    if (
      nextInstallment.status === 'PENDING' &&
      nextInstallment.paidAmount === 0 &&
      interestInstallment.paidAmount > 0
    ) {
      restoreData.paidAmount = interestInstallment.paidAmount;
      restoreData.status = 'PARTIAL';
      restoreData.paidAt = interestInstallment.paidAt;
    }

    await this.prisma.installment.update({ where: { id: nextInstallment.id }, data: restoreData });

    const subsequentInstallments = loanWithInstallments.installments.filter(
      (inst) => inst.installmentNumber > nextInstallment.installmentNumber,
    );

    for (const inst of subsequentInstallments) {
      const prevDate = addPeriods(inst.dueDate, freq, -1);
      await this.prisma.installment.update({
        where: { id: inst.id },
        data: { installmentNumber: inst.installmentNumber - 1, dueDate: prevDate },
      });
    }

    await this.prisma.installment.delete({ where: { id } });
    await this.prisma.loan.update({
      where: { id: interestInstallment.loanId },
      data: { status: 'ACTIVE' },
    });
    return { success: true };
  }

  @Post(':id/pay-interest')
  async payInterest(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() body: { interestAmount?: number; rollImmediately?: boolean },
  ) {
    const { interestAmount, rollImmediately } = body;
    if (interestAmount === undefined || interestAmount <= 0) {
      throw new BadRequestException('Valor do juro inválido');
    }

    const installment = await this.findOwned(userId, id, true);

    if (rollImmediately) {
      await this.prisma.installment.create({
        data: {
          loanId: installment.loanId,
          installmentNumber: installment.installmentNumber,
          dueDate: installment.dueDate,
          amount: interestAmount,
          status: 'PAID',
          paidAmount: interestAmount,
          paidAt: new Date(),
          type: 'INTEREST',
        },
      });

      const loanWithInstallments = installment.loan as typeof installment.loan & {
        installments: { id: string; installmentNumber: number; dueDate: Date }[];
      };
      const freq = installment.loan.paymentFrequency;
      const installmentsToMove = loanWithInstallments.installments.filter(
        (inst) => inst.installmentNumber >= installment.installmentNumber,
      );

      for (const inst of installmentsToMove) {
        const nextDueDate = addPeriods(inst.dueDate, freq, 1);
        await this.prisma.installment.update({
          where: { id: inst.id },
          data: { installmentNumber: inst.installmentNumber + 1, dueDate: nextDueDate },
        });
      }

      await this.prisma.loan.update({
        where: { id: installment.loanId },
        data: { status: 'ACTIVE' },
      });
      return { success: true, rolled: true };
    }

    const updated = await this.prisma.installment.update({
      where: { id },
      data: { status: 'PARTIAL', paidAmount: interestAmount, paidAt: new Date() },
    });
    return { success: true, rolled: false, updated };
  }

  /**
   * Moves a single installment's due date. Used when a debtor arranges to pay on
   * a different day than the schedule produced — only this parcela moves, the
   * others keep their dates and the amounts are untouched.
   */
  @Patch(':id/due-date')
  async setDueDate(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() body: { dueDate?: string },
  ) {
    const installment = await this.findOwned(userId, id);
    if (!body.dueDate) throw new BadRequestException('Data de vencimento obrigatória');

    const dueDate = parseDateOnly(body.dueDate);
    if (Number.isNaN(dueDate.getTime())) throw new BadRequestException('Data inválida');

    // A paid installment's date is part of the settled record; moving it would
    // rewrite when the money was due after the fact.
    if (installment.status === 'PAID') {
      throw new BadRequestException('Parcela quitada não tem o vencimento alterado');
    }

    // The stored status is a cache of "is this past due" — recompute it so a
    // parcela pushed into the future stops showing as atrasada, and vice versa.
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const stillOpen = installment.status === 'PENDING' || installment.status === 'OVERDUE';
    const status = stillOpen
      ? dueDate < todayStart
        ? 'OVERDUE'
        : 'PENDING'
      : installment.status;

    return this.prisma.installment.update({ where: { id }, data: { dueDate, status } });
  }

  // Mute / unmute charging for a single installment
  @Patch(':id/charge')
  async setCharge(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() body: { doNotCharge?: boolean },
  ) {
    await this.findOwned(userId, id);
    return this.prisma.installment.update({
      where: { id },
      data: { doNotCharge: !!body.doNotCharge },
    });
  }
}
