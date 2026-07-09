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

@UseGuards(JwtAuthGuard)
@Controller('borrowers')
export class BorrowersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@CurrentUser('id') userId: string) {
    return this.prisma.borrower.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { loans: true } },
        loans: { select: { installments: { select: { status: true } } } },
      },
    });
  }

  @Post()
  async create(
    @CurrentUser('id') userId: string,
    @Body() body: { name?: string; whatsapp?: string; notes?: string },
  ) {
    const { name, whatsapp, notes } = body;
    if (!name || !whatsapp) {
      throw new BadRequestException('Nome e WhatsApp são obrigatórios');
    }
    return this.prisma.borrower.create({
      data: {
        name,
        whatsapp: whatsapp.replace(/\D/g, ''),
        notes: notes || null,
        userId,
      },
    });
  }

  @Get(':id')
  async get(@CurrentUser('id') userId: string, @Param('id') id: string) {
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

  @Put(':id')
  async update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() body: { name?: string; whatsapp?: string; notes?: string },
  ) {
    const { name, whatsapp, notes } = body;
    const result = await this.prisma.borrower.updateMany({
      where: { id, userId },
      data: {
        name,
        whatsapp: (whatsapp || '').replace(/\D/g, ''),
        notes: notes || null,
      },
    });
    if (result.count === 0) throw new NotFoundException('Not found');
    return this.prisma.borrower.findUnique({ where: { id } });
  }

  @Delete(':id')
  async remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    const result = await this.prisma.borrower.deleteMany({ where: { id, userId } });
    if (result.count === 0) throw new NotFoundException('Not found');
    return { success: true };
  }
}
