import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBorrowerDto, UpdateBorrowerDto } from './dto/borrower.dto';

const onlyDigits = (v: string) => v.replace(/\D/g, '');

@Injectable()
export class BorrowersService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.borrower.findMany({
      where: { userId },
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

  async remove(userId: string, id: string) {
    const result = await this.prisma.borrower.deleteMany({ where: { id, userId } });
    if (result.count === 0) throw new NotFoundException('Not found');
    return { success: true };
  }
}
