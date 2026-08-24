import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TelegramChat } from './telegram-chat.entity';
import { TelegramConfig } from './telegram-config.entity';

const TELEGRAM_API_BASE = 'https://api.telegram.org';
const POLL_TIMEOUT_SECONDS = 25;
const POLL_REQUEST_TIMEOUT_MS = 35_000;
const MIN_RETRY_DELAY_MS = 3_000;
const MAX_RETRY_DELAY_MS = 30_000;

export interface TelegramStatus {
  configured: boolean;
  receiving: boolean;
  polling: boolean;
  chatId: string | null;
  tokenMasked: string | null;
  chatsCount: number;
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

interface TelegramChatInfo {
  id?: number;
  title?: string;
  first_name?: string;
  username?: string;
}

interface TelegramUpdate {
  update_id: number;
  message?: {
    text?: string;
    chat?: TelegramChatInfo;
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
  private pollingEnabled = true;
  private polling = false;
  private offset = 0;
  private retryDelayMs = MIN_RETRY_DELAY_MS;

  constructor(
    @InjectRepository(TelegramConfig)
    private readonly configRepository: Repository<TelegramConfig>,
    @InjectRepository(TelegramChat)
    private readonly chatsRepository: Repository<TelegramChat>,
  ) {}

  get canReceive(): boolean {
    return this.token.length > 0 && this.pollingEnabled;
  }

  get enabled(): boolean {
    return this.canReceive && (this.chatId.length > 0 || this.chatsCount > 0);
  }

  private chatsCount = 0;

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
      polling: this.pollingEnabled,
      chatId: this.chatId || null,
      tokenMasked: this.token ? maskToken(this.token) : null,
      chatsCount: this.chatsCount,
    };
  }

  async updateConfig(input: { token?: string; chatId?: string; polling?: boolean }): Promise<TelegramStatus> {
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
    if (input.polling !== undefined) {
      this.pollingEnabled = input.polling;
      row.pollingEnabled = input.polling;
    }
    await this.configRepository.save(row);
    this.offset = 0;
    this.applyPollingState();
    this.logState();
    return this.getStatus();
  }

  async sendTestMessage(): Promise<SendResult> {
    await this.ensureLoaded();
    if (!this.canReceive) {
      return { ok: false, error: 'Token do bot não configurado.' };
    }
    const targets = await this.resolveTargets();
    if (targets.length === 0) {
      return {
        ok: false,
        error: 'Nenhum chat inscrito ainda. Adicione o bot ao grupo ou mande /start no privado.',
      };
    }
    return this.broadcast('✅ Triagem Docs: mensagem de teste. As notificações de fila chegarão aqui.');
  }

  async sendMessage(text: string): Promise<void> {
    await this.ensureLoaded();
    if (!this.enabled) return;
    const result = await this.broadcast(text);
    if (!result.ok) {
      this.logger.warn(`Falha ao enviar mensagem: ${result.error ?? 'desconhecida'}`);
    }
  }

  private logState(): void {
    if (!this.token) {
      this.logger.warn('Token do bot ausente: Telegram desativado.');
    } else if (!this.pollingEnabled) {
      this.logger.log('Bot pausado manualmente (polling desligado).');
    } else if (this.chatsCount === 0 && !this.chatId) {
      this.logger.log('Bot em long polling: nenhum chat inscrito ainda (envie /start ao bot).');
    } else {
      this.logger.log(`Bot do Telegram ativo: transmitindo para ${this.chatsCount + (this.chatId ? 1 : 0)} chat(s).`);
    }
  }

  private async loadFromDatabase(): Promise<void> {
    const row = await this.configRepository.findOne({ where: { id: 1 } });
    if (row?.token) this.token = row.token;
    if (row?.chatId) this.chatId = row.chatId;
    if (row && typeof row.pollingEnabled === 'boolean') this.pollingEnabled = row.pollingEnabled;
    await this.refreshChatsCount();
  }

  private async refreshChatsCount(): Promise<void> {
    this.chatsCount = await this.chatsRepository.count();
  }

  private async resolveTargets(): Promise<string[]> {
    const rows = await this.chatsRepository.find({ select: { chatId: true } });
    const targets = new Set(rows.map((r) => r.chatId));
    if (this.chatId) targets.add(this.chatId);
    return Array.from(targets);
  }

  private async subscribeChat(chatId: string, title?: string): Promise<void> {
    try {
      const existing = await this.chatsRepository.findOne({ where: { chatId } });
      if (existing) {
        if (title && existing.title !== title) {
          existing.title = title;
          await this.chatsRepository.save(existing);
        }
        return;
      }
      await this.chatsRepository.save(this.chatsRepository.create({ chatId, title: title ?? null }));
      await this.refreshChatsCount();
      this.logger.log(`Novo chat inscrito: ${chatId}${title ? ` (${title})` : ''}.`);
    } catch (error) {
      this.logger.warn(`Falha ao inscrever chat ${chatId}: ${String(error)}`);
    }
  }

  private async broadcast(text: string): Promise<SendResult> {
    const targets = await this.resolveTargets();
    if (targets.length === 0) {
      return { ok: false, error: 'nenhum chat inscrito' };
    }
    let delivered = 0;
    const errors: string[] = [];
    for (const target of targets) {
      const result = await this.sendTo(target, text);
      if (result.ok) {
        delivered += 1;
      } else {
        errors.push(`${target}: ${result.error ?? '?'}`);
      }
    }
    if (delivered === 0) {
      return { ok: false, error: errors.join('; ') };
    }
    return { ok: true };
  }

  private loaded = false;

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    await this.loadFromDatabase();
    this.loaded = true;
  }

  private applyPollingState(): void {
    if (!this.canReceive) {
      this.polling = false;
      return;
    }
    if (!this.polling) {
      this.polling = true;
      this.retryDelayMs = MIN_RETRY_DELAY_MS;
      void this.pollLoop();
    }
  }

  private async findOrCreateRow(): Promise<TelegramConfig> {
    const existing = await this.configRepository.findOne({ where: { id: 1 } });
    if (existing) return existing;
    const created = this.configRepository.create({ id: 1, token: null, chatId: null, pollingEnabled: true });
    return this.configRepository.save(created);
  }

  private async sendDetailed(text: string): Promise<SendResult> {
    return this.sendTo(this.chatId, text);
  }

  private async sendTo(chatId: string, text: string): Promise<SendResult> {
    try {
      const res = await this.request<unknown>('sendMessage', {
        chat_id: chatId,
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
    const message = update.message;
    const chat = message?.chat;
    const chatId = chat?.id;
    if (!message || !chatId || !chat) return;

    const title = chat.title ?? chat.first_name ?? chat.username ?? undefined;
    void this.subscribeChat(String(chatId), title);

    const text = message.text?.trim().toLowerCase().split('@')[0];
    if (text === '/start' || text === '/id') {
      void this.reply(String(chatId), '✅ Chat inscrito! A partir de agora você receberá as notificações da fila.');
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
