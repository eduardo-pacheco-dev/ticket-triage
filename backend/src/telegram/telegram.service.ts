import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TelegramConfig } from './telegram-config.entity';

const TELEGRAM_API_BASE = 'https://api.telegram.org';
const POLL_TIMEOUT_SECONDS = 25;
const POLL_REQUEST_TIMEOUT_MS = 35_000;
const MIN_RETRY_DELAY_MS = 3_000;
const MAX_RETRY_DELAY_MS = 30_000;

export interface TelegramStatus {
  configured: boolean;
  receiving: boolean;
  chatId: string | null;
  tokenMasked: string | null;
}

export interface SendResult {
  ok: boolean;
  error?: string;
}

interface TelegramApiResponse<T> {
  ok: boolean;
  description?: string;
  result?: T;
}

interface TelegramUpdate {
  update_id: number;
  message?: {
    text?: string;
    chat?: { id?: number };
  };
}

export function maskToken(token: string): string {
  if (token.length <= 10) return '****';
  return `${token.slice(0, 6)}...${token.slice(-4)}`;
}

export function formatQueueMessage(input: {
  title: string;
  body: string;
  protocol?: string | null;
}): string {
  const lines = [input.title, input.body];
  if (input.protocol) lines.push(`Protocolo: ${input.protocol}`);
  return lines.filter(Boolean).join('\n');
}

@Injectable()
export class TelegramService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(TelegramService.name);
  private token = process.env.TELEGRAM_BOT_TOKEN?.trim() ?? '';
  private chatId = process.env.TELEGRAM_CHAT_ID?.trim() ?? '';
  private polling = false;
  private offset = 0;
  private retryDelayMs = MIN_RETRY_DELAY_MS;

  constructor(
    @InjectRepository(TelegramConfig)
    private readonly configRepository: Repository<TelegramConfig>,
  ) {}

  get canReceive(): boolean {
    return this.token.length > 0;
  }

  get enabled(): boolean {
    return this.canReceive && this.chatId.length > 0;
  }

  async onApplicationBootstrap(): Promise<void> {
    await this.loadFromDatabase();
    this.logState();
    if (this.canReceive) {
      this.polling = true;
      void this.pollLoop();
    }
  }

  onApplicationShutdown(): void {
    this.polling = false;
  }

  async getStatus(): Promise<TelegramStatus> {
    await this.ensureLoaded();
    return {
      configured: this.enabled,
      receiving: this.canReceive,
      chatId: this.chatId || null,
      tokenMasked: this.token ? maskToken(this.token) : null,
    };
  }

  async updateConfig(input: { token?: string; chatId?: string }): Promise<TelegramStatus> {
    await this.ensureLoaded();
    const row = await this.findOrCreateRow();
    if (input.token !== undefined) {
      this.token = input.token.trim();
      row.token = this.token || null;
    }
    if (input.chatId !== undefined) {
      this.chatId = input.chatId.trim();
      row.chatId = this.chatId || null;
    }
    await this.configRepository.save(row);
    this.offset = 0;
    this.applyPollingState();
    this.logState();
    return this.getStatus();
  }

  async sendTestMessage(): Promise<SendResult> {
    await this.ensureLoaded();
    if (!this.enabled) {
      return { ok: false, error: 'Bot não configurado por completo (token e chat ID).' };
    }
    return this.sendDetailed(
      '✅ Triagem Docs: mensagem de teste. As notificações de fila chegarão aqui.',
    );
  }

  async sendMessage(text: string): Promise<void> {
    if (!this.enabled) return;
    const result = await this.sendDetailed(text);
    if (!result.ok) {
      this.logger.warn(`Falha ao enviar mensagem: ${result.error ?? 'desconhecida'}`);
    }
  }

  private logState(): void {
    if (!this.canReceive) {
      this.logger.warn('Token do bot ausente: Telegram desativado.');
    } else if (!this.chatId) {
      this.logger.log('Bot em long polling sem chat de destino: envie /id ao bot.');
    } else {
      this.logger.log('Bot do Telegram ativo (long polling + envio).');
    }
  }

  private async loadFromDatabase(): Promise<void> {
    const row = await this.configRepository.findOne({ where: { id: 1 } });
    if (row?.token) this.token = row.token;
    if (row?.chatId) this.chatId = row.chatId;
  }

  private loaded = false;

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    await this.loadFromDatabase();
    this.loaded = true;
  }

  private applyPollingState(): void {
    if (this.canReceive && !this.polling) {
      this.polling = true;
      this.retryDelayMs = MIN_RETRY_DELAY_MS;
      void this.pollLoop();
    }
  }

  private async findOrCreateRow(): Promise<TelegramConfig> {
    const existing = await this.configRepository.findOne({ where: { id: 1 } });
    if (existing) return existing;
    const created = this.configRepository.create({ id: 1, token: null, chatId: null });
    return this.configRepository.save(created);
  }

  private async sendDetailed(text: string): Promise<SendResult> {
    try {
      const res = await this.request<unknown>('sendMessage', {
        chat_id: this.chatId,
        text,
      });
      if (!res?.ok) {
        return { ok: false, error: res?.description ?? 'resposta inválida da API' };
      }
      return { ok: true };
    } catch (error) {
      return { ok: false, error: String(error) };
    }
  }

  private async request<T>(method: string, body: Record<string, unknown>): Promise<TelegramApiResponse<T>> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), POLL_REQUEST_TIMEOUT_MS);
    try {
      const res = await globalThis.fetch(`${TELEGRAM_API_BASE}/bot${this.token}/${method}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      return (await res.json()) as TelegramApiResponse<T>;
    } finally {
      clearTimeout(timer);
    }
  }

  private async pollLoop(): Promise<void> {
    while (this.polling && this.canReceive) {
      try {
        const result = await this.request<TelegramUpdate[]>('getUpdates', {
          offset: this.offset,
          timeout: POLL_TIMEOUT_SECONDS,
          allowed_updates: ['message'],
        });
        if (!result?.ok || !Array.isArray(result.result)) {
          if (!result?.ok) {
            this.logger.warn(`getUpdates rejeitado: ${result?.description ?? 'resposta inválida'}.`);
          }
          await this.sleep(this.retryDelayMs);
          this.retryDelayMs = Math.min(this.retryDelayMs * 2, MAX_RETRY_DELAY_MS);
          continue;
        }
        this.retryDelayMs = MIN_RETRY_DELAY_MS;
        for (const update of result.result) {
          this.offset = Math.max(this.offset, update.update_id + 1);
          this.handleUpdate(update);
        }
      } catch (error) {
        if (!this.polling) break;
        this.logger.warn(
          `Falha no polling (${String(error)}); nova tentativa em ${Math.round(this.retryDelayMs / 1000)}s.`,
        );
        await this.sleep(this.retryDelayMs);
        this.retryDelayMs = Math.min(this.retryDelayMs * 2, MAX_RETRY_DELAY_MS);
      }
    }
    this.polling = false;
  }

  private handleUpdate(update: TelegramUpdate): void {
    const text = update.message?.text?.trim().toLowerCase().split('@')[0];
    const chatId = update.message?.chat?.id;
    if (!text || !chatId) return;
    if (text === '/start' || text === '/id') {
      void this.reply(String(chatId), `ID deste chat: ${chatId}\nUse este valor em TELEGRAM_CHAT_ID.`);
    }
  }

  private async reply(chatId: string, text: string): Promise<void> {
    try {
      await this.request('sendMessage', { chat_id: chatId, text });
    } catch {
      // falhas na resposta interativa são ignoradas
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
