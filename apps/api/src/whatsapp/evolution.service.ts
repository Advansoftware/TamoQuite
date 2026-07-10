import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export type EvolutionState = 'open' | 'connecting' | 'close' | 'unknown';

/**
 * Low-level wrapper around the (external) Evolution API v2.
 * The base URL + global apikey come from env (EVOLUTION_API_URL / EVOLUTION_API_KEY);
 * the end user never configures these — they only connect/disconnect their own instance.
 */
@Injectable()
export class EvolutionService {
  private readonly logger = new Logger(EvolutionService.name);
  private readonly http: AxiosInstance;
  private readonly webhookUrl: string;
  readonly enabled: boolean;

  constructor(config: ConfigService) {
    const baseURL = config.get<string>('EVOLUTION_API_URL') || '';
    const apikey = config.get<string>('EVOLUTION_API_KEY') || '';
    // Public URL of THIS API's webhook endpoint, so Evolution can push inbound
    // messages for the auto-reply flow (e.g. https://api.seudominio.com/api/whatsapp/webhook).
    this.webhookUrl = (config.get<string>('EVOLUTION_WEBHOOK_URL') || '').trim();
    this.enabled = !!baseURL && !!apikey;
    this.http = axios.create({
      baseURL: baseURL.replace(/\/$/, ''),
      headers: { apikey, 'Content-Type': 'application/json' },
      timeout: 20000,
    });
  }

  async createInstance(instanceName: string): Promise<void> {
    try {
      const payload: Record<string, unknown> = {
        instanceName,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
      };
      if (this.webhookUrl) {
        payload.webhook = {
          url: this.webhookUrl,
          byEvents: false,
          events: ['MESSAGES_UPSERT'],
        };
      }
      await this.http.post('/instance/create', payload);
    } catch (err: any) {
      // 403/409 => instance already exists; safe to ignore and proceed to connect.
      const status = err?.response?.status;
      if (status !== 403 && status !== 409) {
        this.logger.warn(`createInstance(${instanceName}) failed: ${err?.message}`);
      }
    }
  }

  /** Returns the QR code (base64) and/or pairing code to link the phone. */
  async connect(instanceName: string): Promise<{ qrcode?: string; pairingCode?: string }> {
    const { data } = await this.http.get(`/instance/connect/${instanceName}`);
    return {
      qrcode: data?.base64 || data?.qrcode?.base64 || undefined,
      pairingCode: data?.pairingCode || data?.qrcode?.pairingCode || undefined,
    };
  }

  async connectionState(instanceName: string): Promise<EvolutionState> {
    try {
      const { data } = await this.http.get(`/instance/connectionState/${instanceName}`);
      const state = data?.instance?.state || data?.state;
      if (state === 'open' || state === 'connecting' || state === 'close') return state;
      return 'unknown';
    } catch {
      return 'unknown';
    }
  }

  async logout(instanceName: string): Promise<void> {
    try {
      await this.http.delete(`/instance/logout/${instanceName}`);
    } catch (err: any) {
      this.logger.warn(`logout(${instanceName}) failed: ${err?.message}`);
    }
  }

  /** Sends a text message. Returns the Evolution message id, if any. */
  async sendText(instanceName: string, phone: string, text: string): Promise<string | undefined> {
    const number = this.normalizeNumber(phone);
    const { data } = await this.http.post(`/message/sendText/${instanceName}`, { number, text });
    return data?.key?.id || data?.messageId || undefined;
  }

  private normalizeNumber(phone: string): string {
    const digits = (phone || '').replace(/\D/g, '');
    // Brazilian local numbers (10-11 digits) get the country code prefixed.
    if (digits.length === 10 || digits.length === 11) return `55${digits}`;
    return digits;
  }
}
