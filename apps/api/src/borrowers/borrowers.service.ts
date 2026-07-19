import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBorrowerDto, UpdateBorrowerDto } from './dto/borrower.dto';

const onlyDigits = (v: string) => v.replace(/\D/g, '');

@Injectable()
export class BorrowersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * `status` filters the soft-delete state: 'active' (default), 'inactive' or
   * 'all'. Deactivated clients are never removed — they stay listed under their
   * own tab so history is always recoverable.
   */
  list(userId: string, status: 'active' | 'inactive' | 'all' = 'active') {
    return this.prisma.borrower.findMany({
      where: {
        userId,
        ...(status === 'all' ? {} : { isActive: status === 'active' }),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { loans: true } },
        loans: { select: { installments: { select: { status: true } } } },
      },
    });
  }

  create(userId: string, dto: CreateBorrowerDto) {
    return this.prisma.borrower.create({
      data: {
        name: dto.name,
        whatsapp: onlyDigits(dto.whatsapp),
        notes: dto.notes || null,
        userId,
      },
    });
  }

  async get(userId: string, id: string) {
    const borrower = await this.prisma.borrower.findFirst({
      where: { id, userId },
      include: {
        loans: {
          include: { installments: { orderBy: { installmentNumber: 'asc' } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!borrower) throw new NotFoundException('Borrower not found');
    return borrower;
  }

  async update(userId: string, id: string, dto: UpdateBorrowerDto) {
    // Only touch fields that were actually sent, so a partial update never
    // blanks the whatsapp/notes it omitted.
    const data: { name?: string; whatsapp?: string; notes?: string | null } = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.whatsapp !== undefined) data.whatsapp = onlyDigits(dto.whatsapp);
    if (dto.notes !== undefined) data.notes = dto.notes || null;

    const result = await this.prisma.borrower.updateMany({ where: { id, userId }, data });
    if (result.count === 0) throw new NotFoundException('Not found');
    return this.prisma.borrower.findUnique({ where: { id } });
  }

  /**
   * Soft delete. Nothing is ever erased: the client is deactivated, keeping the
   * contracts and charge history intact and reversible.
   */
  async deactivate(userId: string, id: string) {
    const result = await this.prisma.borrower.updateMany({
      where: { id, userId },
      data: { isActive: false, deactivatedAt: new Date() },
    });
    if (result.count === 0) throw new NotFoundException('Not found');
    return this.prisma.borrower.findUnique({ where: { id } });
  }

  async reactivate(userId: string, id: string) {
    const result = await this.prisma.borrower.updateMany({
      where: { id, userId },
      data: { isActive: true, deactivatedAt: null },
    });
    if (result.count === 0) throw new NotFoundException('Not found');
    return this.prisma.borrower.findUnique({ where: { id } });
  }
}
