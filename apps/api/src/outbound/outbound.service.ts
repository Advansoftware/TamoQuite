import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EvolutionService } from '../whatsapp/evolution.service';
import { GlobalWhatsappService } from '../global-whatsapp/global-whatsapp.service';

const WORKER_TICK_MS = 4000; // how often the drain runs
const BATCH = 40; // max messages inspected per tick
const MAX_ATTEMPTS = 4;
const OWN_RATE_PER_MINUTE = 12; // per-user own-number throttle (1 msg / 5s)
const RETRY_BACKOFF_MS = 60_000; // wait between send attempts
const SATURATED_DELAY_MS = 15_000; // requeue delay when pool/own is momentarily busy
const EXPIRE_MS = 24 * 60 * 60 * 1000; // drop messages stuck PENDING for a day

export interface EnqueueInput {
  userId: string;
  phone: string;
  message: string;
  mode: 'OWN' | 'GLOBAL';
  purpose?: 'BILLING' | 'AUTOREPLY';
  chargeLogId?: string | null;
  scheduledFor?: Date;
  // Pin a specific pool instance (e.g. auto-reply from the number that was messaged).
  instanceName?: string;
}

/**
 * Decouples "deciding to charge" from "actually sending". The billing cron and
 * the auto-reply webhook only enqueue; this worker drains the queue at a safe,
 * per-instance throttled rate so a burst of thousands never fires at once.
 */
@Injectable()
export class OutboundService {
  private readonly logger = new Logger(OutboundService.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly evolution: EvolutionService,
    private readonly pool: GlobalWhatsappService,
  ) {}

  async enqueue(input: EnqueueInput) {
    return this.prisma.outboundMessage.create({
      data: {
        userId: input.userId,
        phone: input.phone,
        message: input.message,
        mode: input.mode,
        purpose: input.purpose ?? 'BILLING',
        chargeLogId: input.chargeLogId ?? null,
        scheduledFor: input.scheduledFor ?? new Date(),
        instanceName: input.instanceName ?? null,
      },
    });
  }

  @Interval(WORKER_TICK_MS)
  async drain() {
    if (this.running || !this.evolution.enabled) return;
    this.running = true;
    try {
      await this.expireStale();
      const now = new Date();
      const batch = await this.prisma.outboundMessage.findMany({
        where: { status: 'PENDING', scheduledFor: { lte: now } },
        orderBy: { scheduledFor: 'asc' },
        take: BATCH,
      });
      for (const msg of batch) {
        await this.processOne(msg.id);
      }
    } catch (err) {
      this.logger.error(`drain failed: ${(err as Error)?.message}`);
    } finally {
      this.running = false;
    }
  }

  private async processOne(id: string) {
    // Claim atomically so overlapping ticks / replicas never double-send.
    const claimed = await this.prisma.outboundMessage.updateMany({
      where: { id, status: 'PENDING' },
      data: { status: 'SENDING' },
    });
    if (claimed.count === 0) return;

    const msg = await this.prisma.outboundMessage.findUnique({ where: { id } });
    if (!msg) return;

    // Resolve an instance allowed to send right now.
    let instanceName: string | null = null;
    let poolId: string | null = null;

    if (msg.mode === 'GLOBAL') {
      // A pinned instance (auto-reply) sends from the exact number that was messaged.
      if (msg.instanceName) {
        const pinned = await this.pool.findByInstanceName(msg.instanceName);
        if (pinned && pinned.isActive) {
          instanceName = pinned.instanceName;
          poolId = pinned.id;
        }
      }
      if (!instanceName) {
        const picked = await this.pool.pickAvailable();
        if (!picked) return this.requeue(id, SATURATED_DELAY_MS);
        instanceName = picked.instanceName;
        poolId = picked.id;
      }
    } else {
      const own = await this.resolveOwn(msg.userId);
      if (!own) return this.requeue(id, SATURATED_DELAY_MS);
      instanceName = own;
    }

    try {
      const messageId = await this.evolution.sendText(instanceName, msg.phone, msg.message);
      await this.prisma.outboundMessage.update({
        where: { id },
        data: { status: 'SENT', instanceName, sentAt: new Date() },
      });
      if (poolId) {
        await this.pool.markSent(poolId);
      } else {
        await this.prisma.whatsappInstance
          .updateMany({ where: { userId: msg.userId }, data: { lastSentAt: new Date() } })
          .catch(() => undefined);
      }
      if (msg.chargeLogId) {
        await this.prisma.chargeLog
          .update({
            where: { id: msg.chargeLogId },
            data: { status: 'SENT', evolutionMessageId: messageId || null, sentAt: new Date() },
          })
          .catch(() => undefined);
      }
    } catch (err) {
      await this.handleFailure(msg.id, msg.attempts, msg.chargeLogId, (err as Error)?.message);
    }
  }

  /** Returns the user's own instance name if it exists and is within its rate gap. */
  private async resolveOwn(userId: string): Promise<string | null> {
    const row = await this.prisma.whatsappInstance.findUnique({ where: { userId } });
    if (!row || row.status !== 'CONNECTED') return null;
    const gapMs = Math.ceil(60000 / OWN_RATE_PER_MINUTE);
    if (row.lastSentAt && Date.now() - row.lastSentAt.getTime() < gapMs) return null;
    return row.instanceName;
  }

  private async requeue(id: string, delayMs: number) {
    await this.prisma.outboundMessage.update({
      where: { id },
      data: { status: 'PENDING', scheduledFor: new Date(Date.now() + delayMs) },
    });
  }

  private async handleFailure(
    id: string,
    attempts: number,
    chargeLogId: string | null,
    error?: string,
  ) {
    const nextAttempts = attempts + 1;
    if (nextAttempts >= MAX_ATTEMPTS) {
      await this.prisma.outboundMessage.update({
        where: { id },
        data: { status: 'FAILED', attempts: nextAttempts, error: error?.slice(0, 500) || 'unknown' },
      });
      if (chargeLogId) {
        await this.prisma.chargeLog
          .update({
            where: { id: chargeLogId },
            data: { status: 'FAILED', error: error?.slice(0, 500) || 'unknown' },
          })
          .catch(() => undefined);
      }
      return;
    }
    await this.prisma.outboundMessage.update({
      where: { id },
      data: {
        status: 'PENDING',
        attempts: nextAttempts,
        error: error?.slice(0, 500) || 'unknown',
        scheduledFor: new Date(Date.now() + RETRY_BACKOFF_MS),
      },
    });
  }

  private async expireStale() {
    const cutoff = new Date(Date.now() - EXPIRE_MS);
    await this.prisma.outboundMessage.updateMany({
      where: { status: 'PENDING', createdAt: { lt: cutoff } },
      data: { status: 'FAILED', error: 'expired' },
    });
  }
}
