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
import { CurrentUser } from '../common/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

@UseGuards(JwtAuthGuard)
@Controller('installments')
export class InstallmentsController {
  constructor(private readonly prisma: PrismaService) {}

  private async findOwned(userId: string, id: string, includeLoanInstallments = false) {
    const installment = await this.prisma.installment.findFirst({
      where: { id },
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
    const installmentsToMove = loanWithInstallments.installments.filter(
      (inst) => inst.installmentNumber >= installment.installmentNumber,
    );

    for (const inst of installmentsToMove) {
      const nextDueDate = new Date(inst.dueDate);
      nextDueDate.setMonth(nextDueDate.getMonth() + 1);

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

    const prevDueDate = new Date(nextInstallment.dueDate);
    prevDueDate.setMonth(prevDueDate.getMonth() - 1);

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
      const prevDate = new Date(inst.dueDate);
      prevDate.setMonth(prevDate.getMonth() - 1);
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
      const installmentsToMove = loanWithInstallments.installments.filter(
        (inst) => inst.installmentNumber >= installment.installmentNumber,
      );

      for (const inst of installmentsToMove) {
        const nextDueDate = new Date(inst.dueDate);
        nextDueDate.setMonth(nextDueDate.getMonth() + 1);
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
