import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EvolutionService } from '../whatsapp/evolution.service';

type PoolStatus = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED';

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Manages the admin-owned pool of WhatsApp numbers used by the GLOBAL sending
 * mode. Exposes selection (LRU + per-instance rate/daily caps) for the worker.
 */
@Injectable()
export class GlobalWhatsappService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly evolution: EvolutionService,
  ) {}

  get enabled(): boolean {
    return this.evolution.enabled;
  }

  async list() {
    return this.prisma.globalWhatsappInstance.findMany({ orderBy: { createdAt: 'asc' } });
  }

  async create(input: { label?: string; ratePerMinute?: number; dailyCap?: number }) {
    if (!this.evolution.enabled) {
      throw new BadRequestException('Integração com WhatsApp não configurada no servidor');
    }
    const instanceName = `tamoquite_global_${randomBytes(4).toString('hex')}`;
    const row = await this.prisma.globalWhatsappInstance.create({
      data: {
        instanceName,
        label: input.label?.trim() || null,
        ratePerMinute: Math.max(1, input.ratePerMinute ?? 8),
        dailyCap: Math.max(0, input.dailyCap ?? 500),
        status: 'CONNECTING',
      },
    });
    await this.evolution.createInstance(instanceName);
    const { qrcode, pairingCode } = await this.evolution.connect(instanceName);
    return { instance: row, qrcode, pairingCode };
  }

  async connect(id: string) {
    const row = await this.getRow(id);
    await this.evolution.createInstance(row.instanceName);
    const { qrcode, pairingCode } = await this.evolution.connect(row.instanceName);
    await this.prisma.globalWhatsappInstance.update({
      where: { id },
      data: { status: 'CONNECTING' },
    });
    return { status: 'CONNECTING' as PoolStatus, qrcode, pairingCode };
  }

  async status(id: string) {
    const row = await this.getRow(id);
    if (!this.evolution.enabled) return { status: 'DISCONNECTED' as PoolStatus };
    const state = await this.evolution.connectionState(row.instanceName);
    const status: PoolStatus =
      state === 'open' ? 'CONNECTED' : state === 'connecting' ? 'CONNECTING' : 'DISCONNECTED';
    const updated = await this.prisma.globalWhatsappInstance.update({
      where: { id },
      data: { status },
    });
    return { status, connectedNumber: updated.connectedNumber };
  }

  async update(id: string, input: { label?: string; isActive?: boolean; ratePerMinute?: number; dailyCap?: number }) {
    await this.getRow(id);
    const data: Record<string, unknown> = {};
    if (input.label !== undefined) data.label = input.label?.trim() || null;
    if (input.isActive !== undefined) data.isActive = input.isActive;
    if (input.ratePerMinute !== undefined) data.ratePerMinute = Math.max(1, input.ratePerMinute);
    if (input.dailyCap !== undefined) data.dailyCap = Math.max(0, input.dailyCap);
    return this.prisma.globalWhatsappInstance.update({ where: { id }, data });
  }

  async disconnect(id: string) {
    const row = await this.getRow(id);
    if (this.evolution.enabled) await this.evolution.logout(row.instanceName);
    await this.prisma.globalWhatsappInstance.update({
      where: { id },
      data: { status: 'DISCONNECTED', connectedNumber: null },
    });
    return { status: 'DISCONNECTED' as PoolStatus };
  }

  async remove(id: string) {
    const row = await this.getRow(id);
    if (this.evolution.enabled) await this.evolution.logout(row.instanceName);
    await this.prisma.globalWhatsappInstance.delete({ where: { id } });
    return { success: true };
  }

  /** Cheap precheck for the cron: is there at least one active instance last seen CONNECTED? */
  async hasConnected(): Promise<boolean> {
    if (!this.evolution.enabled) return false;
    const count = await this.prisma.globalWhatsappInstance.count({
      where: { isActive: true, status: 'CONNECTED' },
    });
    return count > 0;
  }

  /** Is this instance name part of the pool? Used by the auto-reply webhook. */
  async findByInstanceName(instanceName: string) {
    return this.prisma.globalWhatsappInstance.findUnique({ where: { instanceName } });
  }

  /**
   * Picks an available pool instance for sending: active + CONNECTED, under its
   * daily cap and past its per-minute rate gap. LRU by lastSentAt. Returns null
   * when the whole pool is momentarily saturated (worker retries next tick).
   */
  async pickAvailable(): Promise<{ id: string; instanceName: string } | null> {
    const now = new Date();
    const candidates = await this.prisma.globalWhatsappInstance.findMany({
      where: { isActive: true, status: 'CONNECTED' },
      orderBy: [{ lastSentAt: 'asc' }, { createdAt: 'asc' }],
    });
    for (const c of candidates) {
      const sentToday = sameDay(c.dayAnchor, now) ? c.sentToday : 0;
      if (c.dailyCap > 0 && sentToday >= c.dailyCap) continue;
      const gapMs = Math.ceil(60000 / Math.max(1, c.ratePerMinute));
      if (c.lastSentAt && now.getTime() - c.lastSentAt.getTime() < gapMs) continue;
      return { id: c.id, instanceName: c.instanceName };
    }
    return null;
  }

  /** Records a successful send against the instance's rate/daily counters. */
  async markSent(id: string): Promise<void> {
    const row = await this.prisma.globalWhatsappInstance.findUnique({ where: { id } });
    if (!row) return;
    const now = new Date();
    const resetDay = !sameDay(row.dayAnchor, now);
    await this.prisma.globalWhatsappInstance.update({
      where: { id },
      data: {
        lastSentAt: now,
        sentToday: resetDay ? 1 : row.sentToday + 1,
        dayAnchor: resetDay ? now : row.dayAnchor,
      },
    });
  }

  private async getRow(id: string) {
    const row = await this.prisma.globalWhatsappInstance.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Instância global não encontrada');
    return row;
  }
}
