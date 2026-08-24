import { Repository } from 'typeorm';
import { maskToken, formatQueueMessage, TelegramService } from './telegram.service';
import { TelegramConfig } from './telegram-config.entity';

function makeRepo(): Repository<TelegramConfig> {
  return {
    findOne: jest.fn(async () => null),
    save: jest.fn(async (row: unknown) => row),
    create: jest.fn((input: unknown) => input),
  } as unknown as Repository<TelegramConfig>;
}

describe('TelegramService', () => {
  const originalToken = process.env.TELEGRAM_BOT_TOKEN;
  const originalChat = process.env.TELEGRAM_CHAT_ID;
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    process.env.TELEGRAM_BOT_TOKEN = originalToken;
    process.env.TELEGRAM_CHAT_ID = originalChat;
    globalThis.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  function createService(): TelegramService {
    return new TelegramService(makeRepo());
  }

  it('formata a mensagem com título, corpo e protocolo', () => {
    expect(
      formatQueueMessage({ title: 'Nova solicitação', body: 'SITE-01 • Elétrica • Fulano', protocol: 'DOC-ABC1234' }),
    ).toBe('Nova solicitação\nSITE-01 • Elétrica • Fulano\nProtocolo: DOC-ABC1234');
  });

  it('formata sem linha de protocolo quando ausente', () => {
    expect(formatQueueMessage({ title: 'Análise iniciada', body: 'SITE-02 • Hidráulica', protocol: null })).toBe(
      'Análise iniciada\nSITE-02 • Hidráulica',
    );
  });

  it('fica desativado sem token/chat e não envia nada', async () => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_CHAT_ID;
    const fetchMock = jest.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const service = createService();
    expect(service.enabled).toBe(false);
    expect(service.canReceive).toBe(false);
    await service.sendMessage('qualquer coisa');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('pode receber updates apenas com o token, mesmo sem chat de envio', () => {
    process.env.TELEGRAM_BOT_TOKEN = 'token-teste';
    delete process.env.TELEGRAM_CHAT_ID;
    const service = createService();
    expect(service.canReceive).toBe(true);
    expect(service.enabled).toBe(false);
  });

  it('mascara o token exibindo apenas inicio e fim', () => {
    expect(maskToken('8813627015:AAGRtoKjF6mZ3aKDXovb18EH6rAFtHwo5qY')).toBe('881362...o5qY');
    expect(maskToken('curto')).toBe('****');
  });

  it('envia sendMessage quando configurado', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'token-teste';
    process.env.TELEGRAM_CHAT_ID = '-100123';
    const fetchMock = jest.fn(async () =>
      ({ ok: true, json: async () => ({ ok: true }) }) as unknown as Response,
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const service = createService();
    expect(service.enabled).toBe(true);
    await service.sendMessage('olá');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain('/bottoken-teste/sendMessage');
    expect(JSON.parse(String(init.body))).toEqual({ chat_id: '-100123', text: 'olá' });
  });

  it('não propaga erro de rede ao enviar', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'token-teste';
    process.env.TELEGRAM_CHAT_ID = '-100123';
    globalThis.fetch = jest.fn(async () => {
      throw new Error('boom');
    }) as unknown as typeof fetch;

    const service = createService();
    await expect(service.sendMessage('olá')).resolves.toBeUndefined();
  });
});
