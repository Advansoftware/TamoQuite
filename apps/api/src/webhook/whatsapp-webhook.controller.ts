import { Body, Controller, HttpCode, Logger, Post } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GlobalWhatsappService } from '../global-whatsapp/global-whatsapp.service';
import { OutboundService } from '../outbound/outbound.service';
import { BillingSettingsService } from '../billing/billing-settings.service';
import { AUTOREPLY_TEMPLATE, renderTemplate } from '../billing/billing.constants';

const AUTOREPLY_COOLDOWN_MS = 6 * 60 * 60 * 1000; // one auto-reply per debtor per 6h

/**
 * Receives inbound WhatsApp events from the Evolution API. Only reacts to
 * messages that land on a GLOBAL pool number: since that number is anonymous to
 * the debtor, we reply once identifying the creditor. Own-number instances are
 * ignored (the client handles their own replies).
 */
@Controller('whatsapp/webhook')
export class WhatsappWebhookController {
  private readonly logger = new Logger(WhatsappWebhookController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pool: GlobalWhatsappService,
    private readonly outbound: OutboundService,
    private readonly settings: BillingSettingsService,
  ) {}

  @Post()
  @HttpCode(200)
  async handle(@Body() body: any) {
    try {
      const event = String(body?.event || '').toLowerCase().replace(/_/g, '.');
      if (event === 'messages.update') {
        await this.processReceipt(body);
      } else {
        await this.process(body);
      }
    } catch (err: any) {
      this.logger.warn(`webhook processing failed: ${err?.message}`);
    }
    return { received: true };
  }

  /**
   * Delivery/read receipts. Applies to every instance (own numbers and the
   * shared pool alike) because the user needs to know a charge actually landed —
   * `status: SENT` only means WhatsApp accepted it. Matching is by the message id
   * we stored when sending, so a receipt can never touch another user's log.
   */
  private async processReceipt(body: any) {
    const data = Array.isArray(body?.data) ? body.data[0] : body?.data;
    if (!data) return;

    const messageId: string | undefined = data.keyId || data.key?.id || data.id;
    if (!messageId) return;

    const raw = data.status ?? data.update?.status;
    const s = typeof raw === 'number' ? raw : String(raw ?? '').toUpperCase();
    let deliveryStatus: 'DELIVERED' | 'READ' | null = null;
    if (s === 3 || s === 'DELIVERY_ACK') deliveryStatus = 'DELIVERED';
    else if (s === 4 || s === 5 || s === 'READ' || s === 'PLAYED') deliveryStatus = 'READ';
    if (!deliveryStatus) return; // SERVER_ACK/PENDING add nothing over SENT

    const log = await this.prisma.chargeLog.findFirst({ where: { evolutionMessageId: messageId } });
    if (!log) return;
    // Never downgrade a READ back to DELIVERED (receipts can arrive out of order).
    if (log.deliveryStatus === 'READ') return;

    const now = new Date();
    await this.prisma.chargeLog.update({
      where: { id: log.id },
      data: {
        deliveryStatus,
        deliveredAt: log.deliveredAt ?? now,
        readAt: deliveryStatus === 'READ' ? now : log.readAt,
      },
    });
  }

  private async process(body: any) {
    const instance: string | undefined = body?.instance || body?.instanceName;
    if (!instance) return;

    // Only auto-reply for pool numbers.
    const poolInstance = await this.pool.findByInstanceName(instance);
    if (!poolInstance) return;

    const data = Array.isArray(body?.data) ? body.data[0] : body?.data;
    const key = data?.key;
    if (!key || key.fromMe) return; // ignore our own outgoing messages

    const remoteJid: string = key.remoteJid || '';
    if (!remoteJid || remoteJid.endsWith('@g.us')) return; // ignore groups

    const digits = remoteJid.replace(/\D/g, '');
    if (!digits) return;

    // Match the debtor by phone (exact, then by trailing 8 digits as fallback).
    const last8 = digits.slice(-8);
    const borrower =
      (await this.prisma.borrower.findFirst({ where: { whatsapp: digits } })) ||
      (await this.prisma.borrower.findFirst({ where: { whatsapp: { endsWith: last8 } } }));
    if (!borrower) return;

    // Rate-limit: at most one auto-reply per debtor within the cooldown window.
    const recent = await this.prisma.outboundMessage.findFirst({
      where: {
        purpose: 'AUTOREPLY',
        phone: borrower.whatsapp,
        createdAt: { gte: new Date(Date.now() - AUTOREPLY_COOLDOWN_MS) },
      },
    });
    if (recent) return;

    const creditor = await this.prisma.systemUser.findUnique({ where: { id: borrower.userId } });
    if (!creditor) return;
    const settings = await this.settings.getOrCreate(borrower.userId);

    const message = renderTemplate(AUTOREPLY_TEMPLATE, {
      nome: borrower.name,
      valor: 0,
      vencimento: new Date(),
      parcela: 0,
      total: 0,
      credor: creditor.name,
      telefone_credor: settings.contactPhone || '',
    });

    await this.outbound.enqueue({
      userId: borrower.userId,
      phone: borrower.whatsapp,
      message,
      mode: 'GLOBAL',
      purpose: 'AUTOREPLY',
      instanceName: instance, // reply from the same number the debtor messaged
    });
  }
}
