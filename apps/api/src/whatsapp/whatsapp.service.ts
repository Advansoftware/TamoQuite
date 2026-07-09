import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EvolutionService, EvolutionState } from './evolution.service';

export type WhatsappStatus = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED';

function mapState(state: EvolutionState): WhatsappStatus {
  if (state === 'open') return 'CONNECTED';
  if (state === 'connecting') return 'CONNECTING';
  return 'DISCONNECTED';
}

@Injectable()
export class WhatsappService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly evolution: EvolutionService,
  ) {}

  private instanceName(userId: string) {
    return `tamoquite_${userId}`;
  }

  private async ensureRow(userId: string) {
    const name = this.instanceName(userId);
    return this.prisma.whatsappInstance.upsert({
      where: { userId },
      update: {},
      create: { userId, instanceName: name, status: 'DISCONNECTED' },
    });
  }

  async connect(userId: string) {
    if (!this.evolution.enabled) {
      throw new BadRequestException('Integração com WhatsApp não configurada no servidor');
    }
    const row = await this.ensureRow(userId);
    await this.evolution.createInstance(row.instanceName);
    const { qrcode, pairingCode } = await this.evolution.connect(row.instanceName);
    await this.prisma.whatsappInstance.update({
      where: { userId },
      data: { status: 'CONNECTING' },
    });
    return { status: 'CONNECTING' as WhatsappStatus, qrcode, pairingCode };
  }

  async status(userId: string) {
    const row = await this.prisma.whatsappInstance.findUnique({ where: { userId } });
    if (!row || !this.evolution.enabled) {
      return { status: 'DISCONNECTED' as WhatsappStatus, connectedNumber: null };
    }
    const state = await this.evolution.connectionState(row.instanceName);
    const status = mapState(state);
    const updated = await this.prisma.whatsappInstance.update({
      where: { userId },
      data: {
        status,
        lastConnectedAt: status === 'CONNECTED' ? new Date() : row.lastConnectedAt,
      },
    });
    return { status, connectedNumber: updated.connectedNumber };
  }

  async disconnect(userId: string) {
    const row = await this.prisma.whatsappInstance.findUnique({ where: { userId } });
    if (row && this.evolution.enabled) {
      await this.evolution.logout(row.instanceName);
      await this.prisma.whatsappInstance.update({
        where: { userId },
        data: { status: 'DISCONNECTED', connectedNumber: null },
      });
    }
    return { status: 'DISCONNECTED' as WhatsappStatus };
  }

  /** Used by the billing cron. Returns the Evolution message id when sent. */
  async sendMessage(userId: string, phone: string, message: string): Promise<string | undefined> {
    const row = await this.prisma.whatsappInstance.findUnique({ where: { userId } });
    if (!row) throw new BadRequestException('Instância do WhatsApp não encontrada');
    return this.evolution.sendText(row.instanceName, phone, message);
  }

  async isConnected(userId: string): Promise<boolean> {
    const row = await this.prisma.whatsappInstance.findUnique({ where: { userId } });
    if (!row || !this.evolution.enabled) return false;
    const state = await this.evolution.connectionState(row.instanceName);
    return state === 'open';
  }
}
