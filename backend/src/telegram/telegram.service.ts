import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';

const TELEGRAM_API_BASE = 'https://api.telegram.org';
const POLL_TIMEOUT_SECONDS = 25;
const POLL_REQUEST_TIMEOUT_MS = 35_000;
const MIN_RETRY_DELAY_MS = 3_000;
const MAX_RETRY_DELAY_MS = 30_000;

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
  private readonly token = process.env.TELEGRAM_BOT_TOKEN?.trim() ?? '';
  private readonly chatId = process.env.TELEGRAM_CHAT_ID?.trim() ?? '';
  private polling = false;
  private offset = 0;
  private retryDelayMs = MIN_RETRY_DELAY_MS;

  get enabled(): boolean {
    return this.token.length > 0 && this.chatId.length > 0;
  }

  onApplicationBootstrap(): void {
    if (!this.enabled) {
      this.logger.warn('TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID ausentes: bot desativado.');
      return;
    }
    this.logger.log('Bot do Telegram ativado (long polling).');
    this.polling = true;
    void this.pollLoop();
  }

  onApplicationShutdown(): void {
    this.polling = false;
  }

  async sendMessage(text: string): Promise<void> {
    if (!this.enabled) return;
    try {
      const res = await this.request<{ ok: boolean; description?: string }>('sendMessage', {
        chat_id: this.chatId,
        text,
      });
      if (!res?.ok) {
        this.logger.warn(`Falha ao enviar mensagem: ${res?.description ?? 'resposta inválida'}`);
      }
    } catch (error) {
      this.logger.warn(`Erro ao enviar mensagem ao Telegram: ${String(error)}`);
    }
  }

  private async request<T>(method: string, body: Record<string, unknown>): Promise<T | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), POLL_REQUEST_TIMEOUT_MS);
    try {
      const res = await globalThis.fetch(`${TELEGRAM_API_BASE}/bot${this.token}/${method}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      return (await res.json()) as T;
    } finally {
      clearTimeout(timer);
    }
  }

  private async pollLoop(): Promise<void> {
    while (this.polling) {
      try {
        const result = await this.request<{ ok: boolean; result?: Array<{
          update_id: number;
          message?: { text?: string; chat?: { id?: number } };
        }> }>('getUpdates', {
          offset: this.offset,
          timeout: POLL_TIMEOUT_SECONDS,
          allowed_updates: ['message'],
        });
        if (!result?.ok || !Array.isArray(result.result)) continue;
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
  }

  private handleUpdate(update: { message?: { text?: string; chat?: { id?: number } } }): void {
    const text = update.message?.text?.trim().toLowerCase();
    const chatId = update.message?.chat?.id;
    if (!text || !chatId) return;
    if (text === '/start' || text === '/id') {
      void this.sendMessageTo(String(chatId), `ID deste chat: ${chatId}\nConfigure TELEGRAM_CHAT_ID com este valor.`);
    }
  }

  private async sendMessageTo(chatId: string, text: string): Promise<void> {
    try {
      await this.request('sendMessage', { chat_id: chatId, text });
    } catch {
      // ignora falhas de resposta interativa
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
